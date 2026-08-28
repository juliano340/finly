import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import type { TransactionInput } from "./transactions.schema"
import type { TransactionWithRelations } from "./transactions.types"
import { validateExpenseLimit } from "@/features/bank-accounts/bank-accounts.service"
import { moneyToNumber, type MoneyValue } from "@/lib/money"
import { syncCalculatedInvoiceAmount } from "@/features/card-invoices/card-invoices.service"

const includeRelations = {
  category: { select: { id: true, name: true, color: true, icon: true } },
  bankAccount: { select: { id: true, name: true, color: true, institution: true } },
  invoiceItem: {
    select: {
      invoiceId: true,
      invoice: { select: { month: true, card: { select: { id: true, name: true, color: true } } } },
    },
  },
}

export async function getTransactions(
  userId: string,
  filters?: {
    id?: string
    type?: "INCOME" | "EXPENSE"
    categoryId?: string
    month?: string
    page?: number
    limit?: number
  },
  client?: PrismaClient
): Promise<{ transactions: TransactionWithRelations[]; total: number }> {
  const db = client ?? defaultPrisma

  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { userId }
  if (filters?.id) where.id = filters.id
  if (filters?.type) where.type = filters.type
  if (filters?.categoryId) where.categoryId = filters.categoryId
  if (filters?.month) {
    const [year, month] = filters.month.split("-").map(Number)
    where.date = {
      gte: new Date(year, month - 1, 1),
      lt: new Date(year, month, 1),
    }
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: includeRelations,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    db.transaction.count({ where }),
  ])

  return {
    transactions: transactions.map((transaction) => ({
      ...transaction,
      amount: moneyToNumber(transaction.amount),
    })),
    total,
  }
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma

  const category = await db.category.findFirst({
    where: { id: input.categoryId, userId },
    select: { id: true },
  })
  if (!category) throw new Error("Categoria inválida")

  if (input.invoiceId) {
    if (input.type !== "EXPENSE") throw new Error("Somente despesas podem ser lançadas em faturas")
    const invoice = await getEditableInvoice(input.invoiceId, userId, db)
    if (!invoice) throw new Error("Fatura inválida ou fechada")

    const transaction = await db.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          amount: input.amount,
          type: input.type,
          description: input.description ?? null,
          date: input.date,
          categoryId: input.categoryId,
          userId,
        },
      })
      await tx.cardInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          transactionId: created.id,
          kind: "MANUAL",
          postingStatus: "PROJECTED",
          description: input.description ?? "Despesa avulsa",
          amount: input.amount,
          userId,
        },
      })
      return tx.transaction.findUniqueOrThrow({ where: { id: created.id }, include: includeRelations })
    })
    await syncCalculatedInvoiceAmount(invoice.id, userId, db)
    return normalizeTransaction(transaction)
  }

  if (input.bankAccountId) {
    const account = await db.bankAccount.findFirst({
      where: { id: input.bankAccountId, userId },
      select: { id: true },
    })
    if (!account) throw new Error("Conta não encontrada")

    if (input.type === "EXPENSE") {
      const check = await validateExpenseLimit(input.bankAccountId, userId, input.amount, db)
      if (!check.allowed) throw new Error(check.reason)
    }

    return db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: input.amount,
          type: input.type,
          description: input.description ?? null,
          date: input.date,
          categoryId: input.categoryId,
          bankAccountId: input.bankAccountId,
          userId,
        },
        include: includeRelations,
      })

      await tx.bankAccountMovement.create({
        data: {
          bankAccountId: input.bankAccountId!,
          amount: input.amount,
          type: input.type,
          description: `TRANSAÇÃO: ${input.description ?? (input.type === "INCOME" ? "Receita avulsa" : "Despesa avulsa")}`,
          date: input.date,
          transactionId: transaction.id,
          userId,
        },
      })

      return normalizeTransaction(transaction)
    })
  }

  const transaction = await db.transaction.create({
    data: {
      amount: input.amount,
      type: input.type,
      description: input.description ?? null,
      date: input.date,
      categoryId: input.categoryId,
      userId,
    },
    include: includeRelations,
  })
  return normalizeTransaction(transaction)
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: Partial<TransactionInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const existing = await db.transaction.findUnique({ where: { id }, include: { invoiceItem: true } })
  if (!existing || existing.userId !== userId) return null

  if (input.categoryId !== undefined) {
    const category = await db.category.findFirst({
      where: { id: input.categoryId, userId },
      select: { id: true },
    })
    if (!category) throw new Error("Categoria inválida")
  }

  const oldBankAccountId = existing.bankAccountId
  const newBankAccountId = input.bankAccountId
  const oldInvoiceId = existing.invoiceItem?.invoiceId ?? null
  const newInvoiceId = input.invoiceId
  const invoiceChanged = newInvoiceId !== undefined && newInvoiceId !== oldInvoiceId
  const accountChanged = newBankAccountId !== undefined && newBankAccountId !== oldBankAccountId
  const amountChanged = input.amount !== undefined && input.amount !== moneyToNumber(existing.amount)
  const typeChanged = input.type !== undefined && input.type !== existing.type

  if (accountChanged || invoiceChanged || amountChanged || typeChanged || input.description !== undefined) {
    const finalAmount = input.amount ?? moneyToNumber(existing.amount)
    const finalType = input.type ?? existing.type
    const finalBankAccountId = newInvoiceId ? null : (newBankAccountId !== undefined ? newBankAccountId : oldBankAccountId)
    const finalInvoiceId = newBankAccountId ? null : (newInvoiceId !== undefined ? newInvoiceId : oldInvoiceId)

    if (finalInvoiceId) {
      if (finalType !== "EXPENSE") throw new Error("Somente despesas podem ser lançadas em faturas")
      if (!await getEditableInvoice(finalInvoiceId, userId, db)) throw new Error("Fatura inválida ou fechada")
    }

    if (finalBankAccountId) {
      const account = await db.bankAccount.findFirst({
        where: { id: finalBankAccountId, userId },
        select: { id: true },
      })
      if (!account) throw new Error("Conta não encontrada")
    }

    if (finalType === "EXPENSE" && finalBankAccountId) {
      const oldAmount = moneyToNumber(existing.amount)
      const oldEffect = existing.type === "EXPENSE" ? -oldAmount : oldAmount
      const amountToValidate = finalBankAccountId === oldBankAccountId
        ? Math.max(0, finalAmount + oldEffect)
        : finalAmount

      if (amountToValidate > 0) {
        const check = await validateExpenseLimit(finalBankAccountId, userId, amountToValidate, db)
        if (!check.allowed) throw new Error(check.reason)
      }
    }

    const updatedTransaction = await db.$transaction(async (tx) => {
      if (oldBankAccountId) {
        await tx.bankAccountMovement.deleteMany({
          where: { transactionId: id },
        })
      }

      await tx.cardInvoiceItem.deleteMany({ where: { transactionId: id } })

      if (finalBankAccountId) {
        await tx.bankAccountMovement.create({
          data: {
            bankAccountId: finalBankAccountId,
            amount: finalAmount,
            type: finalType,
            description: `TRANSAÇÃO: ${input.description ?? existing.description ?? (finalType === "INCOME" ? "Receita avulsa" : "Despesa avulsa")}`,
            date: input.date ?? existing.date,
            transactionId: id,
            userId,
          },
        })
      }


      if (finalInvoiceId) {
        await tx.cardInvoiceItem.create({
          data: {
            invoiceId: finalInvoiceId,
            transactionId: id,
            kind: "MANUAL",
            postingStatus: "PROJECTED",
            description: input.description ?? existing.description ?? "Despesa avulsa",
            amount: finalAmount,
            userId,
          },
        })
      }

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          ...(input.date !== undefined && { date: input.date }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...((input.bankAccountId !== undefined || input.invoiceId !== undefined) && { bankAccountId: finalBankAccountId || null }),
        },
        include: includeRelations,
      })
      return normalizeTransaction(updated)
    })
    for (const invoiceId of new Set([oldInvoiceId, finalInvoiceId].filter(Boolean) as string[])) {
      await syncCalculatedInvoiceAmount(invoiceId, userId, db)
    }
    return updatedTransaction
  }

  const updated = await db.transaction.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId || null }),
    },
    include: includeRelations,
  })
  return normalizeTransaction(updated)
}

function normalizeTransaction<T extends { amount: MoneyValue }>(transaction: T) {
  return { ...transaction, amount: moneyToNumber(transaction.amount) }
}

function getEditableInvoice(invoiceId: string, userId: string, db: PrismaClient) {
  return db.cardInvoice.findFirst({
    where: { id: invoiceId, userId, lifecycleStatus: { in: ["ESTIMATED", "OPEN"] } },
    select: { id: true },
  })
}

export async function deleteTransaction(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const tx = await db.transaction.findUnique({ where: { id }, include: { invoiceItem: true } })
  if (!tx || tx.userId !== userId) return false

  await db.$transaction(async (prismaTx) => {
    await prismaTx.bankAccountMovement.deleteMany({
      where: { transactionId: id },
    })

    await prismaTx.transaction.delete({ where: { id } })
  })
  if (tx.invoiceItem) await syncCalculatedInvoiceAmount(tx.invoiceItem.invoiceId, userId, db)
  return true
}

export async function batchDeleteTransactions(
  ids: string[],
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const transactions = await db.transaction.findMany({
    where: { id: { in: ids }, userId },
    include: { invoiceItem: true },
  })

  const invoiceIds = new Set<string>()
  for (const tx of transactions) {
    if (tx.invoiceItem) invoiceIds.add(tx.invoiceItem.invoiceId)
  }

  await db.$transaction(async (prismaTx) => {
    const txIds = transactions.map((t) => t.id)
    await prismaTx.bankAccountMovement.deleteMany({ where: { transactionId: { in: txIds } } })
    await prismaTx.cardInvoiceItem.deleteMany({ where: { transactionId: { in: txIds } } })
    await prismaTx.transaction.deleteMany({ where: { id: { in: txIds } } })
  })

  for (const invoiceId of invoiceIds) {
    await syncCalculatedInvoiceAmount(invoiceId, userId, db)
  }

  return transactions.length
}
