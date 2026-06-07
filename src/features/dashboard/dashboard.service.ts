import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"

export interface DashboardStats {
  balance: number
  income: number
  expense: number
  byCategory: { name: string; value: number; color: string }[]
  dailyTrend: { date: string; income: number; expense: number }[]
  recentTransactions: {
    id: string
    description: string | null
    amount: number
    type: "INCOME" | "EXPENSE"
    date: Date
    categoryName: string
    categoryColor: string
  }[]
}

export async function getDashboardStats(
  userId: string,
  month: string,
  client?: PrismaClient
): Promise<DashboardStats> {
  const db = client ?? defaultPrisma
  const [year, m] = month.split("-").map(Number)
  const startDate = new Date(year, m - 1, 1)
  const endDate = new Date(year, m, 1)

  const [incomeTotal, expenseTotal, byCategory, dailyTrend, recentTransactions] =
    await Promise.all([
      db.transaction.aggregate({
        where: { userId, type: "INCOME", date: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { userId, type: "EXPENSE", date: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
      db.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, type: "EXPENSE", date: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      db.transaction.groupBy({
        by: ["date", "type"],
        where: { userId, date: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
      db.transaction.findMany({
        where: { userId, date: { gte: startDate, lt: endDate } },
        include: { category: { select: { name: true, color: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ])

  const categoryIds = byCategory.map((c) => c.categoryId)
  const categories = await db.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, color: true },
  })
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const byCategoryFormatted = byCategory
    .map((item) => {
      const cat = categoryMap.get(item.categoryId)
      return {
        name: cat?.name ?? "Sem categoria",
        value: item._sum.amount ?? 0,
        color: cat?.color ?? "#9CA3AF",
      }
    })
    .filter((item) => item.value > 0)

  const dailyMap = new Map<string, { income: number; expense: number }>()
  for (const entry of dailyTrend) {
    const dayKey = entry.date.toISOString().slice(0, 10)
    if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { income: 0, expense: 0 })
    const day = dailyMap.get(dayKey)!
    if (entry.type === "INCOME") day.income += entry._sum.amount ?? 0
    else day.expense += entry._sum.amount ?? 0
  }

  const dailyTrendFormatted = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date: date.slice(8, 10) + "/" + date.slice(5, 7),
      ...values,
    }))

  const recentFormatted = recentTransactions.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    date: tx.date,
    categoryName: tx.category.name,
    categoryColor: tx.category.color,
  }))

  const income = incomeTotal._sum.amount ?? 0
  const expense = expenseTotal._sum.amount ?? 0

  return {
    balance: income - expense,
    income,
    expense,
    byCategory: byCategoryFormatted,
    dailyTrend: dailyTrendFormatted,
    recentTransactions: recentFormatted,
  }
}
