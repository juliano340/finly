import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import type { BankAccountAdjustmentInput, BankAccountInput, BankAccountMovementInput } from "./bank-accounts.schema"

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

export async function createBankAccountMovement(
  bankAccountId: string,
  userId: string,
  input: BankAccountMovementInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) return null

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
