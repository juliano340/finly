import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import type { TransactionInput } from "./transactions.schema"
import type { TransactionWithRelations } from "./transactions.types"

export async function getTransactions(
  userId: string,
  filters?: {
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
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    db.transaction.count({ where }),
  ])

  return { transactions, total }
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  return db.transaction.create({
    data: {
      amount: input.amount,
      type: input.type,
      description: input.description ?? null,
      date: input.date,
      categoryId: input.categoryId,
      userId,
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  })
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: Partial<TransactionInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const tx = await db.transaction.findUnique({ where: { id } })
  if (!tx || tx.userId !== userId) return null

  return db.transaction.update({
    where: { id },
    data: {
      amount: input.amount,
      type: input.type,
      description: input.description ?? null,
      date: input.date,
      categoryId: input.categoryId,
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  })
}

export async function deleteTransaction(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const tx = await db.transaction.findUnique({ where: { id } })
  if (!tx || tx.userId !== userId) return false

  await db.transaction.delete({ where: { id } })
  return true
}
