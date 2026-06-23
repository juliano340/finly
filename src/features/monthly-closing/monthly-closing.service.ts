import { endOfMonth, parseISO } from "date-fns"
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { computeRecurrenceDates, occurrenceDueDate, type RecurrenceConfig } from "@/lib/recurrence"
import { validateExpenseLimit } from "@/features/bank-accounts/bank-accounts.service"

type FixedCostOccurrenceClient = Pick<PrismaClient, "fixedCost" | "fixedCostOccurrence">

interface CardInvoiceFixedCostSyncInput {
  cardId: string
  financialMonthId: string
  month: string
}

export interface MonthlyClosingSummary {
  month: string
  cardInvoicesTotal: number
  cardInvoicesPaidTotal: number
  fixedCostsTotal: number
  fixedCostsInsideCardTotal: number
  fixedCostsOutsideCardTotal: number
  fixedCostsOutsideCardTotalAll: number
  fixedIncomeTotal: number
  looseExpensesTotal: number
  incomeTotal: number
  totalToPay: number
  totalSpent: number
  projectedBalance: number
  estimatedInvoicesByCard: {
    cardId: string
    cardName: string
    estimatedAmount: number
    invoiceAmount: number
    difference: number
  }[]
  incomeItems: {
    name: string
    amount: number
    type: "FIXED" | "LOOSE"
  }[]
}

export async function getMonthlyClosing(
  userId: string,
  month: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const financialMonth = await ensureFinancialMonth(userId, month, db)

  await ensureFixedCostOccurrences(userId, month, financialMonth.id, db)

  const [invoices, occurrences, looseExpenses, looseIncome] = await Promise.all([
    db.cardInvoice.findMany({
      where: { userId, month },
      include: { card: true },
      orderBy: { dueDate: "asc" },
    }),
    db.fixedCostOccurrence.findMany({
      where: { userId, month, deletedAt: null },
      include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
      orderBy: { fixedCost: { name: "asc" } },
    }),
    aggregateTransactions(userId, month, "EXPENSE", db),
    getLooseIncomeTransactions(userId, month, db),
  ])

  const cardInvoicesTotal = sum(invoices.filter((inv) => inv.status === "PENDING").map((inv) => inv.amount))
  const expenseOccurrences = occurrences.filter((item) => item.fixedCost.type === "EXPENSE")
  const incomeOccurrences = occurrences.filter((item) => item.fixedCost.type === "INCOME")
  const fixedCostsTotal = sum(expenseOccurrences.map((item) => item.amount))
  const fixedIncomeTotal = sum(incomeOccurrences.map((item) => item.amount))
  const insideCard = expenseOccurrences.filter((item) => item.fixedCost.paidInsideCard)
  const outsideCard = expenseOccurrences.filter((item) => !item.fixedCost.paidInsideCard)
  const fixedCostsInsideCardTotal = sum(insideCard.map((item) => item.amount))
  const fixedCostsOutsideCardTotal = sum(outsideCard.filter((item) => item.status === "PENDING").map((item) => item.amount))
  const fixedCostsOutsideCardTotalAll = sum(outsideCard.map((item) => item.amount))
  const totalToPay = cardInvoicesTotal + fixedCostsOutsideCardTotal + looseExpenses

  const allCardInvoices = sum(invoices.map((inv) => inv.amount))
  const allOutsideCard = sum(outsideCard.map((item) => item.amount))
  const totalSpent = allCardInvoices + allOutsideCard + looseExpenses
  const fixedIncomeTotalCalc = sum(incomeOccurrences.map((item) => item.amount))
  const looseIncomeTotal = looseIncome.reduce((acc, tx) => acc + tx.amount, 0)
  const totalIncome = fixedIncomeTotalCalc + looseIncomeTotal

  const incomeItems = [
    ...incomeOccurrences.map((item) => ({
      name: item.fixedCost.name,
      amount: item.amount,
      type: "FIXED" as const,
    })),
    ...looseIncome.map((tx) => ({
      name: tx.description ?? tx.category.name,
      amount: tx.amount,
      type: "LOOSE" as const,
    })),
  ]

  return {
    financialMonth,
    invoices,
    fixedCosts: occurrences,
    summary: {
      month,
      cardInvoicesTotal,
      fixedCostsTotal,
      fixedCostsInsideCardTotal,
      fixedCostsOutsideCardTotal,
      fixedCostsOutsideCardTotalAll,
      cardInvoicesPaidTotal: allCardInvoices - cardInvoicesTotal,
      fixedIncomeTotal: fixedIncomeTotalCalc,
      looseExpensesTotal: looseExpenses,
      incomeTotal: totalIncome,
      totalToPay,
      totalSpent,
      projectedBalance: totalIncome - totalToPay,
      estimatedInvoicesByCard: buildInvoiceEstimates(invoices, insideCard),
      incomeItems,
    } satisfies MonthlyClosingSummary,
  }
}

export async function getMonthlyClosingSummary(
  userId: string,
  month: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const financialMonth = await ensureFinancialMonth(userId, month, db)

  await ensureFixedCostOccurrences(userId, month, financialMonth.id, db)

  const [invoices, occurrences, looseExpenses, income] = await Promise.all([
    db.cardInvoice.findMany({
      where: { userId, month },
      select: { amount: true, status: true },
    }),
    db.fixedCostOccurrence.findMany({
      where: { userId, month, deletedAt: null },
      select: {
        amount: true,
        status: true,
        fixedCost: { select: { type: true, paidInsideCard: true } },
      },
    }),
    aggregateTransactions(userId, month, "EXPENSE", db),
    aggregateTransactions(userId, month, "INCOME", db),
  ])

  const cardInvoicesTotal = sum(invoices.filter((inv) => inv.status === "PENDING").map((inv) => inv.amount))
  const allCardInvoices = sum(invoices.map((inv) => inv.amount))
  const expenseOccurrences = occurrences.filter((item) => item.fixedCost.type === "EXPENSE")
  const incomeOccurrences = occurrences.filter((item) => item.fixedCost.type === "INCOME")
  const insideCard = expenseOccurrences.filter((item) => item.fixedCost.paidInsideCard)
  const outsideCard = expenseOccurrences.filter((item) => !item.fixedCost.paidInsideCard)
  const fixedCostsTotal = sum(expenseOccurrences.map((item) => item.amount))
  const fixedIncomeTotal = sum(incomeOccurrences.map((item) => item.amount))
  const fixedCostsInsideCardTotal = sum(insideCard.map((item) => item.amount))
  const fixedCostsOutsideCardTotal = sum(outsideCard.filter((item) => item.status === "PENDING").map((item) => item.amount))
  const fixedCostsOutsideCardTotalAll = sum(outsideCard.map((item) => item.amount))
  const totalToPay = cardInvoicesTotal + fixedCostsOutsideCardTotal + looseExpenses
  const totalSpent = allCardInvoices + fixedCostsOutsideCardTotalAll + looseExpenses
  const incomeTotal = income + fixedIncomeTotal

  return {
    month,
    cardInvoicesTotal,
    cardInvoicesPaidTotal: allCardInvoices - cardInvoicesTotal,
    fixedCostsTotal,
    fixedCostsInsideCardTotal,
    fixedCostsOutsideCardTotal,
    fixedCostsOutsideCardTotalAll,
    fixedIncomeTotal,
    looseExpensesTotal: looseExpenses,
    incomeTotal,
    totalToPay,
    totalSpent,
    projectedBalance: incomeTotal - totalToPay,
    estimatedInvoicesByCard: [],
    incomeItems: [],
  } satisfies MonthlyClosingSummary
}

export async function payFixedCostOccurrence(
  occurrenceId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const occurrence = await db.fixedCostOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { fixedCost: { include: { bankAccount: true } } },
  })
  if (!occurrence || occurrence.userId !== userId || occurrence.deletedAt) return null
  if (occurrence.status === "PAID") return occurrence

  if (occurrence.fixedCost.type === "EXPENSE" && occurrence.fixedCost.bankAccountId) {
    const check = await validateExpenseLimit(occurrence.fixedCost.bankAccountId, userId, occurrence.amount, client)
    if (!check.allowed) return null
  }

  return db.$transaction(async (tx) => {
    if (occurrence.fixedCost.bankAccountId) {
      await tx.bankAccountMovement.create({
        data: {
          bankAccountId: occurrence.fixedCost.bankAccountId,
          amount: occurrence.amount,
          type: occurrence.fixedCost.type,
          description: `PAGAMENTO ${occurrence.fixedCost.name}`,
          date: new Date(),
          userId,
        },
      })
    }

    return tx.fixedCostOccurrence.update({
      where: { id: occurrenceId },
      data: { status: "PAID", paidAt: new Date() },
      include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
    })
  })
}

export async function unpayFixedCostOccurrence(
  occurrenceId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const occurrence = await db.fixedCostOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { fixedCost: { include: { bankAccount: true } } },
  })
  if (!occurrence || occurrence.userId !== userId || occurrence.deletedAt) return null
  if (occurrence.status !== "PAID") return occurrence

  return db.$transaction(async (tx) => {
    if (occurrence.fixedCost.bankAccountId) {
      const description = `PAGAMENTO ${occurrence.fixedCost.name}`
      const mov = await tx.bankAccountMovement.findFirst({
        where: {
          bankAccountId: occurrence.fixedCost.bankAccountId,
          amount: occurrence.amount,
          type: occurrence.fixedCost.type,
          description,
          userId,
        },
        orderBy: { createdAt: "desc" },
      })
      if (mov) await tx.bankAccountMovement.delete({ where: { id: mov.id } })
    }

    return tx.fixedCostOccurrence.update({
      where: { id: occurrenceId },
      data: { status: "PENDING", paidAt: null },
      include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
    })
  })
}

export async function ensureFixedCostOccurrences(
  userId: string,
  month: string,
  financialMonthId: string,
  db: FixedCostOccurrenceClient
) {
  await ensureFixedCostOccurrencesForMonths(userId, [{ month, financialMonthId }], db)
}

export async function ensureFixedCostOccurrencesForMonths(
  userId: string,
  months: { month: string; financialMonthId: string }[],
  db: FixedCostOccurrenceClient
) {
  if (months.length === 0) return

  const fixedCosts = await db.fixedCost.findMany({
    where: { userId, active: true },
    select: {
      id: true,
      defaultAmount: true,
      dueDay: true,
      startDate: true,
      frequency: true,
      customInterval: true,
      customUnit: true,
      endType: true,
      endDate: true,
      endAfterCount: true,
    },
  })
  if (fixedCosts.length === 0) return

  const maxMonth = months.reduce((a, b) => (a.month > b.month ? a : b)).month
  const maxDate = endOfMonth(parseISO(`${maxMonth}-01`))

  const allDates: { fixedCostId: string; date: Date; month: string }[] = []

  for (const fc of fixedCosts) {
    const config: RecurrenceConfig = {
      startDate: fc.startDate.toISOString().split("T")[0],
      frequency: fc.frequency as RecurrenceConfig["frequency"],
      customInterval: fc.customInterval,
      customUnit: fc.customUnit as RecurrenceConfig["customUnit"],
      endType: fc.endType as RecurrenceConfig["endType"],
      endDate: fc.endDate?.toISOString().split("T")[0] ?? null,
      endAfterCount: fc.endAfterCount,
    }
    const dates = computeRecurrenceDates(config, maxDate)
    for (const date of dates) {
      const due = occurrenceDueDate(date, fc.dueDay)
      const m = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`
      if (months.some((item) => item.month === m)) {
        allDates.push({ fixedCostId: fc.id, date: due, month: m })
      }
    }
  }

  if (allDates.length === 0) return

  const existingOccurrences = await db.fixedCostOccurrence.findMany({
    where: { userId, month: { in: months.map((item) => item.month) } },
    select: { fixedCostId: true, month: true },
  })
  const existingKeys = new Set(
    existingOccurrences.map((item) => `${item.fixedCostId}:${item.month}`)
  )

  const monthMap = new Map(months.map((item) => [item.month, item.financialMonthId]))
  const missingOccurrences = []

  for (const item of allDates) {
    const key = `${item.fixedCostId}:${item.month}`
    if (existingKeys.has(key)) continue
    const fc = fixedCosts.find((f) => f.id === item.fixedCostId)
    if (!fc) continue
    missingOccurrences.push({
      fixedCostId: item.fixedCostId,
      financialMonthId: monthMap.get(item.month)!,
      month: item.month,
      dueDate: item.date,
      amount: fc.defaultAmount,
      userId,
    })
  }

  if (missingOccurrences.length > 0) {
    await db.fixedCostOccurrence.createMany({ data: missingOccurrences })
  }
}

export async function markCardInvoiceFixedCostsPaid(
  userId: string,
  invoice: CardInvoiceFixedCostSyncInput,
  paidAt: Date = new Date(),
  client: FixedCostOccurrenceClient = defaultPrisma
) {
  await ensureFixedCostOccurrences(userId, invoice.month, invoice.financialMonthId, client)

  return client.fixedCostOccurrence.updateMany({
    where: {
      userId,
      month: invoice.month,
      status: "PENDING",
      deletedAt: null,
      fixedCost: {
        paidInsideCard: true,
        cardId: invoice.cardId,
        type: "EXPENSE",
      },
    },
    data: { status: "PAID", paidAt },
  })
}

export async function markCardInvoiceFixedCostsPending(
  userId: string,
  invoice: CardInvoiceFixedCostSyncInput,
  client: FixedCostOccurrenceClient = defaultPrisma
) {
  await ensureFixedCostOccurrences(userId, invoice.month, invoice.financialMonthId, client)

  return client.fixedCostOccurrence.updateMany({
    where: {
      userId,
      month: invoice.month,
      status: "PAID",
      deletedAt: null,
      fixedCost: {
        paidInsideCard: true,
        cardId: invoice.cardId,
        type: "EXPENSE",
      },
    },
    data: { status: "PENDING", paidAt: null },
  })
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

async function getLooseIncomeTransactions(
  userId: string,
  month: string,
  db: PrismaClient
) {
  const [year, m] = month.split("-").map(Number)
  return db.transaction.findMany({
    where: {
      userId,
      type: "INCOME",
      date: { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) },
    },
    select: {
      id: true,
      amount: true,
      description: true,
      category: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })
}

function buildInvoiceEstimates(
  invoices: { cardId: string; amount: number; card: { name: string } }[],
  insideCard: { amount: number; fixedCost: { cardId: string | null; card: { name: string } | null } }[]
) {
  const byCard = new Map<string, { cardName: string; estimatedAmount: number; invoiceAmount: number }>()

  for (const invoice of invoices) {
    byCard.set(invoice.cardId, {
      cardName: invoice.card.name,
      estimatedAmount: 0,
      invoiceAmount: invoice.amount,
    })
  }

  for (const item of insideCard) {
    const cardId = item.fixedCost.cardId
    if (!cardId || !item.fixedCost.card) continue
    const current = byCard.get(cardId) ?? {
      cardName: item.fixedCost.card.name,
      estimatedAmount: 0,
      invoiceAmount: 0,
    }
    current.estimatedAmount += item.amount
    byCard.set(cardId, current)
  }

  return Array.from(byCard.entries()).map(([cardId, item]) => ({
    cardId,
    cardName: item.cardName,
    estimatedAmount: item.estimatedAmount,
    invoiceAmount: item.invoiceAmount,
    difference: item.invoiceAmount - item.estimatedAmount,
  }))
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0)
}
