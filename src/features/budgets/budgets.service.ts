import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import type { BudgetInput } from "./budgets.schema"
import type { BudgetWithCategory, BudgetSummary } from "./budgets.types"

export async function getBudgets(
  userId: string,
  month: string,
  client?: PrismaClient
): Promise<BudgetWithCategory[]> {
  const db = client ?? defaultPrisma
  return db.budget.findMany({
    where: { userId, month },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { category: { name: "asc" } },
  })
}

export async function createBudget(
  userId: string,
  input: BudgetInput,
  client?: PrismaClient
): Promise<BudgetWithCategory> {
  const db = client ?? defaultPrisma
  return db.budget.create({
    data: {
      amount: input.amount,
      month: input.month,
      categoryId: input.categoryId,
      userId,
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  })
}

export async function updateBudget(
  id: string,
  userId: string,
  input: Partial<BudgetInput>,
  client?: PrismaClient
): Promise<BudgetWithCategory | null> {
  const db = client ?? defaultPrisma
  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.userId !== userId) return null

  return db.budget.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  })
}

export async function deleteBudget(
  id: string,
  userId: string,
  client?: PrismaClient
): Promise<boolean> {
  const db = client ?? defaultPrisma
  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.userId !== userId) return false

  await db.budget.delete({ where: { id } })
  return true
}

export async function getBudgetSummary(
  userId: string,
  month: string,
  client?: PrismaClient
): Promise<BudgetSummary[]> {
  const db = client ?? defaultPrisma
  const [year, m] = month.split("-").map(Number)
  const startDate = new Date(year, m - 1, 1)
  const endDate = new Date(year, m, 1)

  const budgets = await db.budget.findMany({
    where: { userId, month },
    include: { category: { select: { id: true, name: true } } },
  })

  const summaries: BudgetSummary[] = []

  for (const budget of budgets) {
    const spent = await db.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: "EXPENSE",
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    })

    const spentAmount = spent._sum.amount ?? 0
    summaries.push({
      budgeted: budget.amount,
      spent: spentAmount,
      remaining: budget.amount - spentAmount,
      percentage: budget.amount > 0 ? Math.round((spentAmount / budget.amount) * 100) : 0,
    })
  }

  return summaries
}
