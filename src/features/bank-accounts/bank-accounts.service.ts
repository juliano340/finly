import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { randomUUID } from "node:crypto"
import type { BankAccountAdjustmentInput, BankAccountInput, BankAccountMovementInput, BankAccountTransferInput } from "./bank-accounts.schema"

export async function getBankAccounts(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const accounts = await db.bankAccount.findMany({
    where: { userId },
    include: {
      cards: { select: { id: true, name: true, brand: true } },
      movements: { orderBy: { date: "desc" }, take: 50 },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  const sums = await db.bankAccountMovement.groupBy({
    by: ["bankAccountId", "type"],
    where: { userId },
    _sum: { amount: true },
  })

  return accounts.map((account) => {
    const income = sums.find((sum) => sum.bankAccountId === account.id && sum.type === "INCOME")?._sum.amount ?? 0
    const expense = sums.find((sum) => sum.bankAccountId === account.id && sum.type === "EXPENSE")?._sum.amount ?? 0
    return {
      ...account,
      balance: account.initialBalance + income - expense,
    }
  })
}

export async function getBankAccountsTotal(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const [accounts, sums] = await Promise.all([
    db.bankAccount.findMany({ where: { userId }, select: { initialBalance: true } }),
    db.bankAccountMovement.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
    }),
  ])

  const initialBalance = accounts.reduce((sum, account) => sum + account.initialBalance, 0)
  const income = sums.find((sum) => sum.type === "INCOME")?._sum.amount ?? 0
  const expense = sums.find((sum) => sum.type === "EXPENSE")?._sum.amount ?? 0
  return initialBalance + income - expense
}

export async function getBankAccountOptions(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  return db.bankAccount.findMany({
    where: { userId, active: true },
    select: { id: true, name: true, institution: true },
    orderBy: { name: "asc" },
  })
}

export async function getBankAccountBalance(
  bankAccountId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) return null

  const sums = await db.bankAccountMovement.groupBy({
    by: ["type"],
    where: { bankAccountId, userId },
    _sum: { amount: true },
  })
  const income = sums.find((sum) => sum.type === "INCOME")?._sum.amount ?? 0
  const expense = sums.find((sum) => sum.type === "EXPENSE")?._sum.amount ?? 0
  return account.initialBalance + income - expense
}

export async function createBankAccount(
  userId: string,
  input: BankAccountInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  return db.bankAccount.create({
    data: {
      name: input.name,
      institution: input.institution ?? null,
      type: input.type,
      color: input.color,
      initialBalance: input.initialBalance,
      overdraftLimit: input.overdraftLimit,
      active: input.active,
      userId,
    },
  })
}

export async function updateBankAccount(
  id: string,
  userId: string,
  input: Partial<BankAccountInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id } })
  if (!account || account.userId !== userId) return null

  return db.bankAccount.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.institution !== undefined && { institution: input.institution }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.initialBalance !== undefined && { initialBalance: input.initialBalance }),
      ...(input.overdraftLimit !== undefined && { overdraftLimit: input.overdraftLimit }),
      ...(input.active !== undefined && { active: input.active }),
    },
  })
}

export async function deleteBankAccount(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id } })
  if (!account || account.userId !== userId) return false

  await db.bankAccount.delete({ where: { id } })
  return true
}

export async function validateExpenseLimit(
  bankAccountId: string,
  userId: string,
  amount: number,
  client?: PrismaClient
): Promise<{ allowed: false; reason: string } | { allowed: true; balance: number; overdraftLimit: number }> {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) {
    return { allowed: false, reason: "Conta não encontrada" }
  }

  const balance = await getBankAccountBalance(bankAccountId, userId, db)
  if (balance === null) {
    return { allowed: false, reason: "Conta não encontrada" }
  }

  const minBalance = -(account.overdraftLimit)
  const balanceAfter = balance - amount

  if (balanceAfter < minBalance) {
    const totalAvailable = balance + account.overdraftLimit
    return {
      allowed: false,
      reason: `Saldo insuficiente. Transferência de R$ ${amount.toFixed(2)} excede o limite disponível de R$ ${totalAvailable.toFixed(2)} (saldo: R$ ${balance.toFixed(2)} + cheque especial: R$ ${account.overdraftLimit.toFixed(2)}).`,
    }
  }

  return { allowed: true, balance, overdraftLimit: account.overdraftLimit }
}

export async function createBankAccountMovement(
  bankAccountId: string,
  userId: string,
  input: BankAccountMovementInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) return null

  if (input.type === "EXPENSE") {
    const check = await validateExpenseLimit(bankAccountId, userId, input.amount, db)
    if (!check.allowed) return null
  }

  return db.bankAccountMovement.create({
    data: {
      bankAccountId,
      amount: input.amount,
      type: input.type,
      description: input.description ?? null,
      date: input.date,
      userId,
    },
  })
}

export async function adjustBankAccountBalance(
  bankAccountId: string,
  userId: string,
  input: BankAccountAdjustmentInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const currentBalance = await getBankAccountBalance(bankAccountId, userId, db)
  if (currentBalance === null) return null

  const diff = Number((input.targetBalance - currentBalance).toFixed(2))
  if (diff === 0) return null
  if (diff < 0) {
    const check = await validateExpenseLimit(bankAccountId, userId, Math.abs(diff), db)
    if (!check.allowed) return null
  }

  return db.bankAccountMovement.create({
    data: {
      bankAccountId,
      amount: Math.abs(diff),
      type: diff > 0 ? "INCOME" : "EXPENSE",
      description: input.description ?? "AJUSTE MANUAL DE SALDO",
      date: input.date,
      userId,
    },
  })
}

export async function transferBetweenBankAccounts(
  userId: string,
  input: BankAccountTransferInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  if (input.fromAccountId === input.toAccountId) return { error: "Conta de origem e destino devem ser diferentes" }

  const check = await validateExpenseLimit(input.fromAccountId, userId, input.amount, db)
  if (!check.allowed) return { error: check.reason }

  const result = await db.$transaction(async (tx) => {
    const accounts = await tx.bankAccount.findMany({
      where: { userId, id: { in: [input.fromAccountId, input.toAccountId] } },
      select: { id: true, name: true },
    })
    const from = accounts.find((account) => account.id === input.fromAccountId)
    const to = accounts.find((account) => account.id === input.toAccountId)
    if (!from || !to) return null

    const transferId = randomUUID()
    const description = input.description?.trim()
    const baseDescription = description ? `${input.method} - ${description}` : input.method

    const outgoing = await tx.bankAccountMovement.create({
      data: {
        bankAccountId: from.id,
        amount: input.amount,
        type: "EXPENSE",
        description: `TRANSFERENCIA_SAIDA:${transferId}:${to.name}:${baseDescription}`,
        date: input.date,
        userId,
      },
    })
    const incoming = await tx.bankAccountMovement.create({
      data: {
        bankAccountId: to.id,
        amount: input.amount,
        type: "INCOME",
        description: `TRANSFERENCIA_ENTRADA:${transferId}:${from.name}:${baseDescription}`,
        date: input.date,
        userId,
      },
    })

    return { outgoing, incoming }
  })

  if (!result) return { error: "Conta de origem ou destino não encontrada" }
  return result
}
