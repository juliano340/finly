import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrencesForMonths } from "@/features/monthly-closing/monthly-closing.service"

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
  incomeFixedCosts: number
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

  await ensureMonthlyEvolutionData(userId, months, db)

  const [invoiceTotals, fixedCostTotals, looseExpenseTotals] = await Promise.all([
    getInvoiceTotalsByMonth(userId, months, db),
    getFixedCostTotalsByMonth(userId, months, db),
    getLooseExpenseTotalsByMonth(userId, months, db),
  ])

  const items = months.map((month) => {
    const invoices = invoiceTotals.get(month) ?? 0
    const fixedCosts = fixedCostTotals.expenses.get(month) ?? 0
    const incomeFixedCosts = fixedCostTotals.income.get(month) ?? 0
    const looseExpenses = looseExpenseTotals.get(month) ?? 0
    const total = invoices + fixedCosts + looseExpenses
    return {
      month,
      label: formatMonthShort(month),
      total,
      invoices,
      fixedCosts,
      incomeFixedCosts,
      looseExpenses,
    }
  })

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

async function ensureMonthlyEvolutionData(userId: string, months: string[], db: PrismaClient) {
  const monthEntries = await Promise.all(
    months.map(async (m) => {
      const fm = await ensureFinancialMonth(userId, m, db)
      return { month: m, financialMonthId: fm.id }
    })
  )
  await ensureFixedCostOccurrencesForMonths(userId, monthEntries, db)
}

async function getInvoiceTotalsByMonth(userId: string, months: string[], db: PrismaClient) {
  const rows = await db.cardInvoice.groupBy({
    by: ["month"],
    where: { userId, month: { in: months } },
    _sum: { amount: true },
  })
  return new Map(rows.map((row) => [row.month, row._sum.amount ?? 0]))
}

async function getFixedCostTotalsByMonth(userId: string, months: string[], db: PrismaClient) {
  const occurrences = await db.fixedCostOccurrence.findMany({
    where: { userId, month: { in: months }, deletedAt: null },
    select: {
      amount: true,
      month: true,
      fixedCost: { select: { paidInsideCard: true, type: true } },
    },
  })
  const expenses = new Map<string, number>()
  const income = new Map<string, number>()

  for (const occurrence of occurrences) {
    if (occurrence.fixedCost.type === "INCOME") {
      income.set(occurrence.month, (income.get(occurrence.month) ?? 0) + occurrence.amount)
    } else if (!occurrence.fixedCost.paidInsideCard) {
      expenses.set(occurrence.month, (expenses.get(occurrence.month) ?? 0) + occurrence.amount)
    }
  }

  return { expenses, income }
}

async function getLooseExpenseTotalsByMonth(userId: string, months: string[], db: PrismaClient) {
  const firstMonth = months[0]
  const lastMonth = months.at(-1)
  if (!firstMonth || !lastMonth) return new Map<string, number>()

  const startDate = monthStart(firstMonth)
  const endDate = nextMonthStart(lastMonth)
  const transactions = await db.transaction.findMany({
    where: { userId, type: "EXPENSE", date: { gte: startDate, lt: endDate } },
    select: { amount: true, date: true },
  })
  const totals = new Map<string, number>()
  const monthSet = new Set(months)

  for (const transaction of transactions) {
    const month = formatMonthKey(transaction.date)
    if (!monthSet.has(month)) continue
    totals.set(month, (totals.get(month) ?? 0) + transaction.amount)
  }

  return totals
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

function previousMonths(endMonth: string, count: number) {
  const [year, month] = endMonth.split("-").map(Number)
  const months: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(year, month - 1 - offset, 1)
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

function monthStart(month: string) {
  const [year, m] = month.split("-").map(Number)
  return new Date(year, m - 1, 1)
}

function nextMonthStart(month: string) {
  const [year, m] = month.split("-").map(Number)
  return new Date(year, m, 1)
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthShort(month: string) {
  const [year, m] = month.split("-").map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
}
