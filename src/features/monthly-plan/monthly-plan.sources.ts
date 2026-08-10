import { TZDate } from "@date-fns/tz"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import { BUSINESS_TIME_ZONE } from "./monthly-plan.types"

type SourceOccurrence = {
  amount: Prisma.Decimal
  fixedCost: { type: "INCOME" | "EXPENSE"; paidInsideCard: boolean }
}

export interface MonthlyFinancialSources {
  suggestedIncome: Prisma.Decimal
  committedExpenses: Prisma.Decimal
  variableSpent: Prisma.Decimal
}

export function composeMonthlyFinancialSources(input: {
  invoices: { amount: Prisma.Decimal }[]
  occurrences: SourceOccurrence[]
  variableSpent: Prisma.Decimal
}): MonthlyFinancialSources {
  const suggestedIncome = sumDecimals(
    input.occurrences
      .filter((item) => item.fixedCost.type === "INCOME")
      .map((item) => item.amount),
  )
  const outsideCardExpenses = input.occurrences
    .filter(
      (item) =>
        item.fixedCost.type === "EXPENSE" && !item.fixedCost.paidInsideCard,
    )
    .map((item) => item.amount)

  return {
    suggestedIncome,
    committedExpenses: sumDecimals([
      ...input.invoices.map((invoice) => invoice.amount),
      ...outsideCardExpenses,
    ]),
    variableSpent: input.variableSpent,
  }
}

export async function loadMonthlyFinancialSources(
  userId: string,
  month: string,
  asOf: Date,
  db: PrismaClient,
): Promise<MonthlyFinancialSources> {
  const transactionWindow = getMonthlyTransactionWindow(month, asOf)
  const [invoices, occurrences, variableExpenses] = await Promise.all([
    db.cardInvoice.findMany({
      where: { userId, month },
      select: { amount: true },
    }),
    db.fixedCostOccurrence.findMany({
      where: { userId, month, deletedAt: null },
      select: {
        amount: true,
        fixedCost: { select: { type: true, paidInsideCard: true } },
      },
    }),
    db.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: transactionWindow.start, lt: transactionWindow.end },
      },
      _sum: { amount: true },
    }),
  ])

  return composeMonthlyFinancialSources({
    invoices,
    occurrences,
    variableSpent: new Prisma.Decimal(variableExpenses._sum.amount?.toString() ?? 0),
  })
}

export function getMonthlyTransactionWindow(month: string, asOf: Date) {
  const [year, monthNumber] = month.split("-").map(Number)
  const start = new TZDate(
    year,
    monthNumber - 1,
    1,
    0,
    0,
    0,
    0,
    BUSINESS_TIME_ZONE,
  )
  const monthEnd = new TZDate(
    year,
    monthNumber,
    1,
    0,
    0,
    0,
    0,
    BUSINESS_TIME_ZONE,
  )
  const current = new TZDate(asOf.getTime(), BUSINESS_TIME_ZONE)
  const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`

  if (month !== currentMonth) return { start, end: monthEnd }

  const nextDayStart = new TZDate(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + 1,
    0,
    0,
    0,
    0,
    BUSINESS_TIME_ZONE,
  )
  return { start, end: nextDayStart < monthEnd ? nextDayStart : monthEnd }
}

function sumDecimals(values: Prisma.Decimal[]) {
  return values.reduce(
    (total, value) => total.plus(value),
    new Prisma.Decimal(0),
  )
}
