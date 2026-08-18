import { endOfMonth, parseISO } from "date-fns"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { computeRecurrenceDates, occurrenceDueDate, type RecurrenceConfig } from "@/lib/recurrence"
import { validateExpenseLimit } from "@/features/bank-accounts/bank-accounts.service"
import { moneyToNumber, sumMoney, type MoneyValue } from "@/lib/money"
import { composeMonthlyFinancialSources } from "@/features/monthly-plan/monthly-plan.sources"
import { calculateInvoiceTotals } from "@/features/card-invoices/invoice-calculation"

type FixedCostOccurrenceClient = Pick<PrismaClient, "fixedCost" | "fixedCostOccurrence">

class AmbiguousLegacyMovementError extends Error {}

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
  cardForecastsWithoutInvoiceTotal: number
  fixedCostsOutsideCardTotal: number
  fixedCostsOutsideCardTotalAll: number
  fixedIncomeTotal: number
  looseExpensesTotal: number
  incomeTotal: number
  receivedIncomeTotal: number
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
    status: "PENDING" | "PAID"
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

  const [invoices, occurrences, looseExpenseItems, looseIncome] = await Promise.all([
    db.cardInvoice.findMany({
      where: { userId, month },
      include: { card: true, items: true },
      orderBy: { dueDate: "asc" },
    }),
    db.fixedCostOccurrence.findMany({
      where: { userId, month, deletedAt: null },
      include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
      orderBy: { fixedCost: { name: "asc" } },
    }),
    getLooseExpenseTransactions(userId, month, db),
    getLooseIncomeTransactions(userId, month, db),
  ])

  const expenseOccurrences = occurrences.filter((item) => item.fixedCost.type === "EXPENSE")
  const incomeOccurrences = occurrences.filter((item) => item.fixedCost.type === "INCOME")
  const fixedCostsTotal = sum(expenseOccurrences.map((item) => item.amount))
  const fixedIncomeTotal = sum(incomeOccurrences.map((item) => item.amount))
  const looseExpenses = sum(looseExpenseItems.map((item) => item.amount))
  const insideCard = expenseOccurrences.filter((item) => item.fixedCost.paidInsideCard)
  const outsideCard = expenseOccurrences.filter((item) => !item.fixedCost.paidInsideCard)
  const invoicesWithTotals = invoices.map((invoice) => {
    const totals = calculateInvoiceTotals({
      ...invoice,
      fixedOccurrences: insideCard.filter((item) => item.fixedCost.cardId === invoice.cardId),
    })
    return {
      ...invoice,
      ...totals,
      amount: totals.effectiveTotal,
      items: invoice.items.map((item) => ({ ...item, amount: moneyToNumber(item.amount) })),
    }
  })
  const cardInvoicesTotal = sum(invoicesWithTotals.filter((inv) => inv.status === "PENDING").map((inv) => inv.amount))
  const fixedCostsInsideCardTotal = sum(insideCard.map((item) => item.amount))
  const invoiceCardIds = new Set(invoices.map((invoice) => invoice.cardId))
  const cardForecastsWithoutInvoiceTotal = sum(insideCard.filter((item) => !item.fixedCost.cardId || !invoiceCardIds.has(item.fixedCost.cardId)).map((item) => item.amount))
  const fixedCostsOutsideCardTotal = sum(outsideCard.filter((item) => item.status === "PENDING").map((item) => item.amount))
  const fixedCostsOutsideCardTotalAll = sum(outsideCard.map((item) => item.amount))
  const totalToPay = cardInvoicesTotal + cardForecastsWithoutInvoiceTotal + fixedCostsOutsideCardTotal + looseExpenses

  const allCardInvoices = sum(invoicesWithTotals.map((inv) => inv.amount))
  const totalSpent = moneyToNumber(
    composeMonthlyFinancialSources({
      invoices,
      occurrences,
      variableSpent: new Prisma.Decimal(looseExpenses),
    }).committedExpenses.plus(looseExpenses),
  )
  const looseIncomeTotal = sum(looseIncome.map((tx) => tx.amount))
  const totalIncome = fixedIncomeTotal + looseIncomeTotal
  const receivedFixedIncomeTotal = sum(incomeOccurrences.filter((item) => item.status === "PAID").map((item) => item.amount))
  const receivedIncomeTotal = receivedFixedIncomeTotal + looseIncomeTotal

  const incomeItems = [
    ...incomeOccurrences.map((item) => ({
      name: item.fixedCost.name,
      amount: moneyToNumber(item.amount),
      type: "FIXED" as const,
      status: item.status,
    })),
    ...looseIncome.map((tx) => ({
      name: tx.description ?? tx.category.name,
      amount: moneyToNumber(tx.amount),
      type: "LOOSE" as const,
      status: "PAID" as const,
    })),
  ]

  return {
    financialMonth,
    invoices: invoicesWithTotals,
    fixedCosts: occurrences,
    looseExpenses: looseExpenseItems,
    summary: {
      month,
      cardInvoicesTotal,
      fixedCostsTotal,
      fixedCostsInsideCardTotal,
      cardForecastsWithoutInvoiceTotal,
      fixedCostsOutsideCardTotal,
      fixedCostsOutsideCardTotalAll,
      cardInvoicesPaidTotal: allCardInvoices - cardInvoicesTotal,
      fixedIncomeTotal,
      looseExpensesTotal: looseExpenses,
      incomeTotal: totalIncome,
      receivedIncomeTotal,
      totalToPay,
      totalSpent,
      projectedBalance: totalIncome - totalSpent,
      estimatedInvoicesByCard: buildInvoiceEstimates(invoicesWithTotals, insideCard),
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
      select: {
        amount: true,
        status: true,
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
        status: true,
        fixedCost: { select: { type: true, paidInsideCard: true, cardId: true } },
      },
    }),
    aggregateTransactions(userId, month, "EXPENSE", db),
    aggregateTransactions(userId, month, "INCOME", db),
  ])

  const expenseOccurrences = occurrences.filter((item) => item.fixedCost.type === "EXPENSE")
  const incomeOccurrences = occurrences.filter((item) => item.fixedCost.type === "INCOME")
  const insideCard = expenseOccurrences.filter((item) => item.fixedCost.paidInsideCard)
  const outsideCard = expenseOccurrences.filter((item) => !item.fixedCost.paidInsideCard)
  const invoicesWithTotals = invoices.map((invoice) => {
    const totals = calculateInvoiceTotals({
      ...invoice,
      items: invoice.items.map((item) => ({ ...item, postingStatus: "POSTED" as const })),
      fixedOccurrences: insideCard.filter((item) => item.fixedCost.cardId === invoice.cardId),
    })
    return { ...invoice, amount: totals.effectiveTotal }
  })
  const cardInvoicesTotal = sum(invoicesWithTotals.filter((inv) => inv.status === "PENDING").map((inv) => inv.amount))
  const allCardInvoices = sum(invoicesWithTotals.map((inv) => inv.amount))
  const fixedCostsTotal = sum(expenseOccurrences.map((item) => item.amount))
  const fixedIncomeTotal = sum(incomeOccurrences.map((item) => item.amount))
  const receivedIncomeTotal = sum(incomeOccurrences.filter((item) => item.status === "PAID").map((item) => item.amount)) + income
  const fixedCostsInsideCardTotal = sum(insideCard.map((item) => item.amount))
  const invoiceCardIds = new Set(invoices.map((invoice) => invoice.cardId))
  const cardForecastsWithoutInvoiceTotal = sum(insideCard.filter((item) => !item.fixedCost.cardId || !invoiceCardIds.has(item.fixedCost.cardId)).map((item) => item.amount))
  const fixedCostsOutsideCardTotal = sum(outsideCard.filter((item) => item.status === "PENDING").map((item) => item.amount))
  const fixedCostsOutsideCardTotalAll = sum(outsideCard.map((item) => item.amount))
  const totalToPay = cardInvoicesTotal + cardForecastsWithoutInvoiceTotal + fixedCostsOutsideCardTotal + looseExpenses
  const totalSpent = moneyToNumber(
    composeMonthlyFinancialSources({
      invoices,
      occurrences,
      variableSpent: new Prisma.Decimal(looseExpenses),
    }).committedExpenses.plus(looseExpenses),
  )
  const incomeTotal = income + fixedIncomeTotal

  return {
    month,
    cardInvoicesTotal,
    cardInvoicesPaidTotal: allCardInvoices - cardInvoicesTotal,
    fixedCostsTotal,
    fixedCostsInsideCardTotal,
    cardForecastsWithoutInvoiceTotal,
    fixedCostsOutsideCardTotal,
    fixedCostsOutsideCardTotalAll,
    fixedIncomeTotal,
    looseExpensesTotal: looseExpenses,
    incomeTotal,
    receivedIncomeTotal,
    totalToPay,
    totalSpent,
    projectedBalance: incomeTotal - totalSpent,
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
    const check = await validateExpenseLimit(
      occurrence.fixedCost.bankAccountId,
      userId,
      moneyToNumber(occurrence.amount),
      client
    )
    if (!check.allowed) return null
  }

  return db.$transaction(async (tx) => {
    const paidAt = new Date()
    const claimed = await tx.fixedCostOccurrence.updateMany({
      where: { id: occurrenceId, userId, status: "PENDING", deletedAt: null },
      data: { status: "PAID", paidAt },
    })

    if (claimed.count === 0) {
      return tx.fixedCostOccurrence.findFirst({
        where: { id: occurrenceId, userId, deletedAt: null },
        include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
      })
    }

    let bankAccountMovementId: string | null = null
    if (occurrence.fixedCost.bankAccountId) {
      const movement = await tx.bankAccountMovement.create({
        data: {
          bankAccountId: occurrence.fixedCost.bankAccountId,
          amount: occurrence.amount,
          type: occurrence.fixedCost.type,
          description: `PAGAMENTO ${occurrence.fixedCost.name}`,
          date: new Date(),
          userId,
        },
      })
      bankAccountMovementId = movement.id
    }

    return tx.fixedCostOccurrence.update({
      where: { id: occurrenceId },
      data: { bankAccountMovementId },
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

  try {
    return await db.$transaction(async (tx) => {
      const claimed = await tx.fixedCostOccurrence.updateMany({
        where: { id: occurrenceId, userId, status: "PAID", deletedAt: null },
        data: { status: "PENDING", paidAt: null },
      })

      if (claimed.count === 0) {
        return tx.fixedCostOccurrence.findFirst({
          where: { id: occurrenceId, userId, deletedAt: null },
          include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
        })
      }

      if (occurrence.bankAccountMovementId) {
        await tx.bankAccountMovement.deleteMany({
          where: { id: occurrence.bankAccountMovementId, userId },
        })
      } else if (occurrence.fixedCost.bankAccountId) {
        const description = `PAGAMENTO ${occurrence.fixedCost.name}`
        const legacyMovements = await tx.bankAccountMovement.findMany({
          where: {
            bankAccountId: occurrence.fixedCost.bankAccountId,
            amount: occurrence.amount,
            type: occurrence.fixedCost.type,
            description,
            userId,
            fixedCostOccurrence: null,
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        })
        if (legacyMovements.length > 1) throw new AmbiguousLegacyMovementError()
        if (legacyMovements.length === 1) {
          await tx.bankAccountMovement.delete({ where: { id: legacyMovements[0].id } })
        }
      }

      return tx.fixedCostOccurrence.update({
        where: { id: occurrenceId },
        data: { bankAccountMovementId: null },
        include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
      })
    })
  } catch (error) {
    if (error instanceof AmbiguousLegacyMovementError) return null
    throw error
  }
}

export async function payFixedCostOccurrenceWithCard(
  occurrenceId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const occurrence = await db.fixedCostOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { fixedCost: true },
  })
  if (!occurrence || occurrence.userId !== userId || occurrence.deletedAt) return null
  if (occurrence.status === "PAID") return occurrence
  if (!occurrence.fixedCost.paidInsideCard) return null

  return db.fixedCostOccurrence.update({
    where: { id: occurrenceId },
    data: { status: "PAID", paidAt: new Date(), paidViaCard: true },
    include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
  })
}

export async function unpayFixedCostOccurrenceWithCard(
  occurrenceId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const occurrence = await db.fixedCostOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { fixedCost: true },
  })
  if (!occurrence || occurrence.userId !== userId || occurrence.deletedAt) return null
  if (occurrence.status !== "PAID") return occurrence
  if (!occurrence.fixedCost.paidInsideCard || !occurrence.paidViaCard) return null

  return db.fixedCostOccurrence.update({
    where: { id: occurrenceId },
    data: { status: "PENDING", paidAt: null, paidViaCard: false },
    include: { fixedCost: { include: { category: true, card: true, bankAccount: true } } },
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

  const allDates: { fixedCostId: string; scheduledDate: Date; dueDate: Date; month: string }[] = []

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
        allDates.push({ fixedCostId: fc.id, scheduledDate: date, dueDate: due, month: m })
      }
    }
  }

  if (allDates.length === 0) return

  const existingOccurrences = await db.fixedCostOccurrence.findMany({
    where: { userId, month: { in: months.map((item) => item.month) } },
    select: { fixedCostId: true, month: true, scheduledDate: true, dueDate: true },
  })
  const occurrenceKey = (fixedCostId: string, scheduledDate: Date) =>
    `${fixedCostId}:${scheduledDate.getTime()}`
  const groupKey = (fixedCostId: string, month: string) => `${fixedCostId}:${month}`
  const existingKeys = new Set(
    existingOccurrences
      .filter((item) => item.scheduledDate)
      .map((item) => occurrenceKey(item.fixedCostId, item.scheduledDate!))
  )

  const generatedByGroup = new Map<string, typeof allDates>()
  for (const item of allDates) {
    const key = groupKey(item.fixedCostId, item.month)
    const group = generatedByGroup.get(key) ?? []
    group.push(item)
    generatedByGroup.set(key, group)
  }

  const legacyByGroup = new Map<string, typeof existingOccurrences>()
  for (const item of existingOccurrences.filter((occurrence) => !occurrence.scheduledDate)) {
    const key = groupKey(item.fixedCostId, item.month)
    const group = legacyByGroup.get(key) ?? []
    group.push(item)
    legacyByGroup.set(key, group)
  }

  for (const [key, legacyOccurrences] of legacyByGroup) {
    const generated = generatedByGroup.get(key) ?? []
    for (const legacy of legacyOccurrences) {
      const matchingDueDate = generated.find((item) =>
        !existingKeys.has(occurrenceKey(item.fixedCostId, item.scheduledDate)) &&
        legacy.dueDate?.getTime() === item.dueDate.getTime()
      )
      const fallback = generated.find((item) =>
        !existingKeys.has(occurrenceKey(item.fixedCostId, item.scheduledDate))
      )
      const consumed = matchingDueDate ?? fallback
      if (consumed) existingKeys.add(occurrenceKey(consumed.fixedCostId, consumed.scheduledDate))
    }
  }

  const monthMap = new Map(months.map((item) => [item.month, item.financialMonthId]))
  const fixedCostMap = new Map(fixedCosts.map((item) => [item.id, item]))
  const missingOccurrences = []

  for (const item of allDates) {
    const key = occurrenceKey(item.fixedCostId, item.scheduledDate)
    if (existingKeys.has(key)) continue
    const fc = fixedCostMap.get(item.fixedCostId)
    if (!fc) continue
    missingOccurrences.push({
      fixedCostId: item.fixedCostId,
      financialMonthId: monthMap.get(item.month)!,
      month: item.month,
      scheduledDate: item.scheduledDate,
      dueDate: item.dueDate,
      amount: fc.defaultAmount,
      userId,
    })
  }

  for (const occurrence of missingOccurrences) {
    await db.fixedCostOccurrence.upsert({
      where: {
        fixedCostId_scheduledDate: {
          fixedCostId: occurrence.fixedCostId,
          scheduledDate: occurrence.scheduledDate,
        },
      },
      update: {},
      create: occurrence,
    })
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
      paidViaCard: false,
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
      invoiceItem: null,
      OR: [{ bankAccountId: null }, { bankAccount: { type: { not: "BENEFIT" } } }],
      date: { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) },
    },
    _sum: { amount: true },
  })
  return moneyToNumber(result._sum.amount ?? 0)
}

async function getLooseExpenseTransactions(
  userId: string,
  month: string,
  db: PrismaClient
) {
  const [year, m] = month.split("-").map(Number)
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      invoiceItem: null,
      OR: [{ bankAccountId: null }, { bankAccount: { type: { not: "BENEFIT" } } }],
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
  return transactions.map((transaction) => ({
    ...transaction,
    amount: moneyToNumber(transaction.amount),
  }))
}

async function getLooseIncomeTransactions(
  userId: string,
  month: string,
  db: PrismaClient
) {
  const [year, m] = month.split("-").map(Number)
  const transactions = await db.transaction.findMany({
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
  return transactions.map((transaction) => ({
    ...transaction,
    amount: moneyToNumber(transaction.amount),
  }))
}

function buildInvoiceEstimates(
  invoices: { cardId: string; amount: MoneyValue; card: { name: string } }[],
  insideCard: { amount: MoneyValue; fixedCost: { cardId: string | null; card: { name: string } | null } }[]
) {
  const byCard = new Map<string, { cardName: string; estimatedAmount: number; invoiceAmount: number }>()

  for (const invoice of invoices) {
    byCard.set(invoice.cardId, {
      cardName: invoice.card.name,
      estimatedAmount: 0,
      invoiceAmount: moneyToNumber(invoice.amount),
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
    current.estimatedAmount = sumMoney([current.estimatedAmount, item.amount])
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

function sum(values: MoneyValue[]) {
  return sumMoney(values)
}
