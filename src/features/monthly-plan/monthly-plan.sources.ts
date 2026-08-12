import { TZDate } from "@date-fns/tz"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import { BUSINESS_TIME_ZONE } from "./monthly-plan.types"

type SourceOccurrence = {
  id?: string
  amount: Prisma.Decimal
  fixedCost: { type: "INCOME" | "EXPENSE"; paidInsideCard: boolean; cardId?: string | null }
}

type SourceInvoice = {
  amount: Prisma.Decimal
  cardId?: string | null
  calculationMode?: "CALCULATED" | "ENTERED_TOTAL"
  enteredTotal?: Prisma.Decimal | null
  items?: { amount: Prisma.Decimal; fixedCostOccurrenceId: string | null }[]
}

export interface MonthlyFinancialSources {
  suggestedIncome: Prisma.Decimal
  committedExpenses: Prisma.Decimal
  variableSpent: Prisma.Decimal
}

export function composeMonthlyFinancialSources(input: {
  invoices: SourceInvoice[]
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

  const fixedInsideByCard = new Map<string, SourceOccurrence[]>()
  for (const occurrence of input.occurrences) {
    if (occurrence.fixedCost.type !== "EXPENSE" || !occurrence.fixedCost.paidInsideCard) continue
    const cardId = occurrence.fixedCost.cardId ?? "__no_card__"
    const group = fixedInsideByCard.get(cardId) ?? []
    group.push(occurrence)
    fixedInsideByCard.set(cardId, group)
  }

  const coveredCards = new Set<string>()
  const invoiceTotals = input.invoices.map((invoice) => {
    const cardId = invoice.cardId ?? "__no_card__"
    coveredCards.add(cardId)
    if ((invoice.calculationMode ?? "ENTERED_TOTAL") === "ENTERED_TOTAL") {
      return invoice.enteredTotal ?? invoice.amount
    }
    const linkedIds = new Set(
      (invoice.items ?? []).flatMap((item) => item.fixedCostOccurrenceId ? [item.fixedCostOccurrenceId] : []),
    )
    return sumDecimals([
      ...(invoice.items ?? []).map((item) => item.amount),
      ...(fixedInsideByCard.get(cardId) ?? [])
        .filter((occurrence) => !occurrence.id || !linkedIds.has(occurrence.id))
        .map((occurrence) => occurrence.amount),
    ])
  })
  const fixedWithoutInvoice = Array.from(fixedInsideByCard.entries())
    .filter(([cardId]) => !coveredCards.has(cardId))
    .flatMap(([, occurrences]) => occurrences.map((occurrence) => occurrence.amount))

  return {
    suggestedIncome,
    committedExpenses: sumDecimals([
      ...invoiceTotals,
      ...outsideCardExpenses,
      ...fixedWithoutInvoice,
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
      select: {
        amount: true,
        cardId: true,
        calculationMode: true,
        enteredTotal: true,
        items: { select: { amount: true, fixedCostOccurrenceId: true } },
      },
    }),
    db.fixedCostOccurrence.findMany({
      where: { userId, month, deletedAt: null },
      select: {
        id: true,
        amount: true,
        fixedCost: { select: { type: true, paidInsideCard: true, cardId: true } },
      },
    }),
    db.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        invoiceItem: null,
        OR: [{ bankAccountId: null }, { bankAccount: { type: { not: "BENEFIT" } } }],
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
