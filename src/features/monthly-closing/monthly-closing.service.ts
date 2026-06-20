import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"

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
}

export async function getMonthlyClosing(
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
      include: { card: true },
      orderBy: { dueDate: "asc" },
    }),
    db.fixedCostOccurrence.findMany({
      where: { userId, month },
      include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
      orderBy: { fixedCost: { name: "asc" } },
    }),
    aggregateTransactions(userId, month, "EXPENSE", db),
    aggregateTransactions(userId, month, "INCOME", db),
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
  const totalIncome = income + fixedIncomeTotal

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
      fixedIncomeTotal,
      looseExpensesTotal: looseExpenses,
      incomeTotal: totalIncome,
      totalToPay,
      totalSpent,
      projectedBalance: totalIncome - totalToPay,
      estimatedInvoicesByCard: buildInvoiceEstimates(invoices, insideCard),
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
      where: { userId, month },
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
  if (!occurrence || occurrence.userId !== userId) return null
  if (occurrence.status === "PAID") return occurrence

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
  if (!occurrence || occurrence.userId !== userId) return null
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

  const monthKeys = months.map((item) => item.month)
  const fixedCosts = await db.fixedCost.findMany({
    where: { userId, active: true },
    select: { id: true, defaultAmount: true },
  })
  if (fixedCosts.length === 0) return

  const existingOccurrences = await db.fixedCostOccurrence.findMany({
    where: { userId, month: { in: monthKeys } },
    select: { fixedCostId: true, month: true },
  })
  const existingKeys = new Set(existingOccurrences.map((item) => `${item.fixedCostId}:${item.month}`))
  const missingOccurrences = []

  for (const item of months) {
    for (const fixedCost of fixedCosts) {
      const key = `${fixedCost.id}:${item.month}`
      if (existingKeys.has(key)) continue
      missingOccurrences.push({
        fixedCostId: fixedCost.id,
        financialMonthId: item.financialMonthId,
        month: item.month,
        amount: fixedCost.defaultAmount,
        userId,
      })
    }
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
