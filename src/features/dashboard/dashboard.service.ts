import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"

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

export interface MonthlyEvolutionItem {
  month: string
  label: string
  total: number
  invoices: number
  fixedCosts: number
  looseExpenses: number
}

export interface MonthlyEvolutionStats {
  months: MonthlyEvolutionItem[]
  currentTotal: number
  previousTotal: number
  changePercent: number | null
  average: number
  highestMonth: MonthlyEvolutionItem | null
}

export interface CardInvoiceEvolutionCard {
  id: string
  name: string
  color: string
}

export interface CardInvoiceEvolutionMonth {
  month: string
  label: string
  total: number
  cards: Record<string, number>
}

export interface CardInvoiceEvolutionStats {
  cards: CardInvoiceEvolutionCard[]
  months: CardInvoiceEvolutionMonth[]
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

export async function getMonthlyEvolution(
  userId: string,
  endMonth: string,
  monthsCount = 6,
  client?: PrismaClient
): Promise<MonthlyEvolutionStats> {
  const db = client ?? defaultPrisma
  const months = previousMonths(endMonth, monthsCount)

  const items = []
  for (const month of months) {
    const financialMonth = await ensureFinancialMonth(userId, month, db)
    await ensureFixedCostOccurrences(userId, month, financialMonth.id, db)

    const [invoices, fixedCosts, looseExpenses] = await Promise.all([
      db.cardInvoice.aggregate({
        where: { userId, month },
        _sum: { amount: true },
      }),
      db.fixedCostOccurrence.findMany({
        where: { userId, month, fixedCost: { paidInsideCard: false } },
        select: { amount: true },
      }),
      aggregateTransactions(userId, month, "EXPENSE", db),
    ])

    const invoiceTotal = invoices._sum.amount ?? 0
    const fixedCostTotal = fixedCosts.reduce((sum, item) => sum + item.amount, 0)
    const total = invoiceTotal + fixedCostTotal + looseExpenses
    items.push({
      month,
      label: formatMonthShort(month),
      total,
      invoices: invoiceTotal,
      fixedCosts: fixedCostTotal,
      looseExpenses,
    })
  }

  const current = items.at(-1)?.total ?? 0
  const previous = items.at(-2)?.total ?? 0
  const sum = items.reduce((acc, item) => acc + item.total, 0)

  return {
    months: items,
    currentTotal: current,
    previousTotal: previous,
    changePercent: previous > 0 ? ((current - previous) / previous) * 100 : null,
    average: items.length ? sum / items.length : 0,
    highestMonth: items.length ? items.reduce((highest, item) => item.total > highest.total ? item : highest, items[0]) : null,
  }
}

export async function getCardInvoiceEvolution(
  userId: string,
  endMonth: string,
  monthsCount = 6,
  client?: PrismaClient
): Promise<CardInvoiceEvolutionStats> {
  const db = client ?? defaultPrisma
  const months = previousMonths(endMonth, monthsCount)

  const invoices = await db.cardInvoice.findMany({
    where: { userId, month: { in: months } },
    include: { card: { select: { id: true, name: true, color: true } } },
    orderBy: [{ month: "asc" }, { dueDate: "asc" }],
  })

  const cards = new Map<string, CardInvoiceEvolutionCard>()
  for (const invoice of invoices) {
    cards.set(invoice.card.id, {
      id: invoice.card.id,
      name: invoice.card.name,
      color: invoice.card.color,
    })
  }

  const items = months.map((month) => ({
    month,
    label: formatMonthShort(month),
    total: 0,
    cards: {} as Record<string, number>,
  }))
  const byMonth = new Map(items.map((item) => [item.month, item]))

  for (const invoice of invoices) {
    const item = byMonth.get(invoice.month)
    if (!item) continue
    item.total += invoice.amount
    item.cards[invoice.cardId] = (item.cards[invoice.cardId] ?? 0) + invoice.amount
  }

  return {
    cards: Array.from(cards.values()).sort((a, b) => a.name.localeCompare(b.name)),
    months: items,
  }
}

async function aggregateTransactions(
  userId: string,
  month: string,
  type: "INCOME" | "EXPENSE",
  db: PrismaClient
) {
  const [year, m] = month.split("-").map(Number)
  const result = await db.transaction.aggregate({
    where: {
      userId,
      type,
      date: { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0
}

function previousMonths(endMonth: string, count: number) {
  const [year, month] = endMonth.split("-").map(Number)
  const months: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(year, month - 1 - offset, 1)
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

function formatMonthShort(month: string) {
  const [year, m] = month.split("-").map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
}
