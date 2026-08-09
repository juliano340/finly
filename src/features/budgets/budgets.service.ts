import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import type { BudgetInput } from "./budgets.schema"
import type { BudgetWithCategory, BudgetSummary } from "./budgets.types"
import { moneyToNumber, subtractMoney } from "@/lib/money"

export async function getBudgets(
  userId: string,
  month: string,
  client?: PrismaClient
): Promise<BudgetWithCategory[]> {
  const db = client ?? defaultPrisma
  const budgets = await db.budget.findMany({
    where: { userId, month },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { category: { name: "asc" } },
  })
  return budgets.map((budget) => ({ ...budget, amount: moneyToNumber(budget.amount) }))
}

export async function createBudget(
  userId: string,
  input: BudgetInput,
  client?: PrismaClient
): Promise<BudgetWithCategory> {
  const db = client ?? defaultPrisma
  const budget = await db.budget.create({
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
  return { ...budget, amount: moneyToNumber(budget.amount) }
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

  const updated = await db.budget.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  })
  return { ...updated, amount: moneyToNumber(updated.amount) }
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

    const budgeted = moneyToNumber(budget.amount)
    const spentAmount = moneyToNumber(spent._sum.amount ?? 0)
    summaries.push({
      budgeted,
      spent: spentAmount,
      remaining: subtractMoney(budgeted, spentAmount),
      percentage: budgeted > 0 ? Math.round((spentAmount / budgeted) * 100) : 0,
    })
  }

  return summaries
}
