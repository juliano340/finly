import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import type { TransactionInput } from "./transactions.schema"
import type { TransactionWithRelations } from "./transactions.types"
import { validateExpenseLimit } from "@/features/bank-accounts/bank-accounts.service"
import { moneyToNumber, type MoneyValue } from "@/lib/money"

const includeRelations = {
  category: { select: { id: true, name: true, color: true, icon: true } },
  bankAccount: { select: { id: true, name: true, color: true, institution: true } },
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

  if (input.bankAccountId) {
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
  const existing = await db.transaction.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return null

  const oldBankAccountId = existing.bankAccountId
  const newBankAccountId = input.bankAccountId
  const accountChanged = newBankAccountId !== undefined && newBankAccountId !== oldBankAccountId
  const amountChanged = input.amount !== undefined && input.amount !== moneyToNumber(existing.amount)
  const typeChanged = input.type !== undefined && input.type !== existing.type

  if (accountChanged || amountChanged || typeChanged) {
    const finalAmount = input.amount ?? moneyToNumber(existing.amount)
    const finalType = input.type ?? existing.type
    const finalBankAccountId = newBankAccountId !== undefined ? newBankAccountId : oldBankAccountId

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

    return db.$transaction(async (tx) => {
      if (oldBankAccountId) {
        await tx.bankAccountMovement.deleteMany({
          where: { transactionId: id },
        })
      }

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

      const updated = await tx.transaction.update({
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
    })
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

export async function deleteTransaction(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const tx = await db.transaction.findUnique({ where: { id } })
  if (!tx || tx.userId !== userId) return false

  return db.$transaction(async (prismaTx) => {
    await prismaTx.bankAccountMovement.deleteMany({
      where: { transactionId: id },
    })

    await prismaTx.transaction.delete({ where: { id } })
    return true
  })
}
