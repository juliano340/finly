import { prisma as defaultPrisma } from "@/lib/prisma"
import type { CardInvoice, CardInvoiceItem, PrismaClient } from "@/generated/prisma/client"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import type { CardInvoiceInput, CardInvoiceItemInput } from "./card-invoices.schema"
import { calculateInvoiceTotals } from "./invoice-calculation"

export async function getCardInvoices(userId: string, month?: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const invoices = await db.cardInvoice.findMany({
    where: { userId, ...(month && { month }) },
    include: { card: true, items: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ month: "desc" }, { dueDate: "asc" }],
  })
  return enrichInvoices(invoices, userId, db)
}

export async function createCardInvoice(userId: string, input: CardInvoiceInput, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const card = await db.card.findUnique({ where: { id: input.cardId } })
  if (!card || card.userId !== userId) return null

  const financialMonth = await ensureFinancialMonth(userId, input.month, db)
  const calculationMode = input.calculationMode ?? "ENTERED_TOTAL"
  const enteredTotal = input.enteredTotal ?? input.amount ?? 0
  const status = input.status ?? "PENDING"
  const lifecycleStatus = status === "PAID" ? "PAID" : (input.lifecycleStatus ?? "OPEN")
  const invoice = await db.cardInvoice.create({
    data: {
      cardId: input.cardId,
      financialMonthId: financialMonth.id,
      month: input.month,
      dueDate: input.dueDate,
      amount: calculationMode === "ENTERED_TOTAL" ? enteredTotal : 0,
      enteredTotal,
      calculationMode,
      lifecycleStatus,
      closedAt: lifecycleStatus === "CLOSED" ? new Date() : null,
      status,
      paidAt: status === "PAID" ? input.paidAt ?? new Date() : null,
      userId,
    },
    include: { card: true, items: true },
  })
  return (await enrichInvoices([invoice as typeof invoice & { items: CardInvoiceItem[] }], userId, db))[0]
}

export async function updateCardInvoice(
  id: string,
  userId: string,
  input: Partial<CardInvoiceInput>,
  client?: PrismaClient,
) {
  const db = client ?? defaultPrisma
  const invoice = await db.cardInvoice.findUnique({ where: { id } })
  if (!invoice || invoice.userId !== userId) return null

  const reopening = input.lifecycleStatus === "OPEN" || input.lifecycleStatus === "ESTIMATED"
  const changesFinancialData = input.cardId !== undefined || input.amount !== undefined ||
    input.enteredTotal !== undefined || input.calculationMode !== undefined || input.dueDate !== undefined
  if (["CLOSED", "PAID"].includes(invoice.lifecycleStatus) && changesFinancialData && !reopening) return null

  if (input.cardId) {
    const card = await db.card.findUnique({ where: { id: input.cardId } })
    if (!card || card.userId !== userId) return null
  }

  const calculationMode = input.calculationMode ?? invoice.calculationMode
  const enteredTotal = input.enteredTotal ?? input.amount ?? invoice.enteredTotal ?? invoice.amount
  const lifecycleStatus = input.status === "PAID" ? "PAID" : (input.lifecycleStatus ?? invoice.lifecycleStatus)
  const updated = await db.cardInvoice.update({
    where: { id },
    data: {
      ...(input.cardId !== undefined && { cardId: input.cardId }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      calculationMode,
      enteredTotal,
      ...(calculationMode === "ENTERED_TOTAL" && { amount: enteredTotal }),
      lifecycleStatus,
      closedAt: lifecycleStatus === "CLOSED" ? invoice.closedAt ?? new Date() : null,
      ...(input.status !== undefined && { status: input.status }),
      paidAt: input.status === "PAID"
        ? input.paidAt ?? invoice.paidAt ?? new Date()
        : input.status === "PENDING" ? null : input.paidAt,
    },
    include: { card: true, items: { orderBy: { createdAt: "asc" } } },
  })
  await syncCalculatedInvoiceAmount(id, userId, db)
  return (await enrichInvoices([updated as typeof updated & { items: CardInvoiceItem[] }], userId, db))[0]
}

export async function createCardInvoiceItem(
  invoiceId: string,
  userId: string,
  input: CardInvoiceItemInput,
  client?: PrismaClient,
) {
  const db = client ?? defaultPrisma
  const invoice = await db.cardInvoice.findFirst({ where: { id: invoiceId, userId } })
  if (!invoice || ["CLOSED", "PAID"].includes(invoice.lifecycleStatus)) return null

  if (input.fixedCostOccurrenceId) {
    const occurrence = await db.fixedCostOccurrence.findFirst({
      where: {
        id: input.fixedCostOccurrenceId,
        userId,
        month: invoice.month,
        fixedCost: { cardId: invoice.cardId, paidInsideCard: true },
      },
    })
    if (!occurrence) return null
  }
  if (input.importedTransactionId) {
    const imported = await db.importedTransaction.findFirst({ where: { id: input.importedTransactionId, userId } })
    if (!imported) return null
  }

  const item = await db.cardInvoiceItem.create({
    data: {
      ...input,
      kind: input.kind ?? "MANUAL",
      postingStatus: input.postingStatus ?? "POSTED",
      invoiceId,
      userId,
    },
  })
  await syncCalculatedInvoiceAmount(invoiceId, userId, db)
  return item
}

export async function deleteCardInvoiceItem(
  invoiceId: string,
  itemId: string,
  userId: string,
  client?: PrismaClient,
) {
  const db = client ?? defaultPrisma
  const invoice = await db.cardInvoice.findFirst({ where: { id: invoiceId, userId } })
  if (!invoice || ["CLOSED", "PAID"].includes(invoice.lifecycleStatus)) return false
  const removed = await db.cardInvoiceItem.deleteMany({ where: { id: itemId, invoiceId, userId } })
  if (removed.count === 0) return false
  await syncCalculatedInvoiceAmount(invoiceId, userId, db)
  return true
}

export async function deleteCardInvoice(id: string, userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const invoice = await db.cardInvoice.findUnique({ where: { id } })
  if (!invoice || invoice.userId !== userId) return false
  await db.cardInvoice.delete({ where: { id } })
  return true
}

export async function copyCardInvoices(
  fromMonth: string,
  toMonth: string,
  userId: string,
  client?: PrismaClient,
  invoiceIds?: string[],
) {
  const db = client ?? defaultPrisma
  const sourceInvoices = await db.cardInvoice.findMany({
    where: { userId, month: fromMonth, ...(invoiceIds?.length ? { id: { in: invoiceIds } } : {}) },
    include: { items: true },
  })
  if (sourceInvoices.length === 0) return []

  const financialMonth = await ensureFinancialMonth(userId, toMonth, db)
  if (invoiceIds?.length) {
    const sourceCardIds = sourceInvoices.map((invoice) => invoice.cardId)
    await db.cardInvoice.deleteMany({ where: { userId, month: toMonth, cardId: { in: sourceCardIds } } })
  } else {
    await db.cardInvoice.deleteMany({ where: { userId, month: toMonth } })
  }

  const created = []
  for (const invoice of sourceInvoices) {
    const copy = await db.cardInvoice.create({
      data: {
        cardId: invoice.cardId,
        financialMonthId: financialMonth.id,
        month: toMonth,
        dueDate: dueDateForTargetMonth(invoice.dueDate, toMonth),
        amount: invoice.amount,
        enteredTotal: invoice.enteredTotal,
        calculationMode: invoice.calculationMode,
        lifecycleStatus: "ESTIMATED",
        status: "PENDING",
        userId,
        items: {
          create: invoice.items
            .filter((item) => !item.fixedCostOccurrenceId && !item.importedTransactionId && !item.transactionId)
            .map((item) => ({
              kind: item.kind,
              postingStatus: item.postingStatus,
              description: item.description,
              amount: item.amount,
              installmentGroupId: item.installmentGroupId,
              installmentNumber: item.installmentNumber,
              installmentCount: item.installmentCount,
              userId,
            })),
        },
      },
      include: { card: true, items: true },
    })
    await syncCalculatedInvoiceAmount(copy.id, userId, db)
    created.push(copy)
  }
  return enrichInvoices(created, userId, db)
}

export async function getCardInvoiceMonths(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const rows = await db.cardInvoice.findMany({
    where: { userId }, distinct: ["month"], select: { month: true }, orderBy: { month: "desc" },
  })
  return rows.map((row) => ({ month: row.month, count: 0 }))
}

export async function syncCalculatedInvoiceAmount(id: string, userId: string, db: PrismaClient = defaultPrisma) {
  const invoice = await db.cardInvoice.findFirst({
    where: { id, userId },
    include: { items: true },
  })
  if (!invoice || invoice.calculationMode !== "CALCULATED" || invoice.lifecycleStatus === "PAID") return
  const occurrences = await fixedOccurrencesForInvoice(invoice, userId, db)
  const totals = calculateInvoiceTotals({ ...invoice, fixedOccurrences: occurrences })
  await db.cardInvoice.update({ where: { id }, data: { amount: totals.effectiveTotal } })
}

async function enrichInvoices<Invoice extends CardInvoice & { items: CardInvoiceItem[] }>(invoices: Invoice[], userId: string, db: PrismaClient) {
  return Promise.all(invoices.map(async (invoice) => {
    const fixedOccurrences = await fixedOccurrencesForInvoice(invoice, userId, db)
    return { ...invoice, fixedOccurrences, ...calculateInvoiceTotals({ ...invoice, fixedOccurrences }) }
  }))
}

function fixedOccurrencesForInvoice(
  invoice: { cardId: string; month: string },
  userId: string,
  db: PrismaClient,
) {
  return db.fixedCostOccurrence.findMany({
    where: {
      userId,
      month: invoice.month,
      deletedAt: null,
      fixedCost: { type: "EXPENSE", paidInsideCard: true, cardId: invoice.cardId },
    },
    select: { id: true, amount: true, fixedCost: { select: { name: true } } },
  })
}

function dueDateForTargetMonth(sourceDueDate: Date, targetMonth: string) {
  const [year, month] = targetMonth.split("-").map(Number)
  const sourceDay = sourceDueDate.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return new Date(Date.UTC(year, month - 1, Math.min(sourceDay, lastDay)))
}
