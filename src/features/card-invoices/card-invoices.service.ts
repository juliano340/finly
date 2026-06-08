import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import type { CardInvoiceInput } from "./card-invoices.schema"

export async function getCardInvoices(
  userId: string,
  month?: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  return db.cardInvoice.findMany({
    where: { userId, ...(month && { month }) },
    include: { card: true },
    orderBy: [{ month: "desc" }, { dueDate: "asc" }],
  })
}

export async function createCardInvoice(
  userId: string,
  input: CardInvoiceInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const card = await db.card.findUnique({ where: { id: input.cardId } })
  if (!card || card.userId !== userId) return null

  const financialMonth = await ensureFinancialMonth(userId, input.month, db)
  return db.cardInvoice.create({
    data: {
      cardId: input.cardId,
      financialMonthId: financialMonth.id,
      month: input.month,
      dueDate: input.dueDate,
      amount: input.amount,
      status: input.status,
      paidAt: input.status === "PAID" ? input.paidAt ?? new Date() : null,
      userId,
    },
    include: { card: true },
  })
}

export async function updateCardInvoice(
  id: string,
  userId: string,
  input: Partial<CardInvoiceInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const invoice = await db.cardInvoice.findUnique({ where: { id } })
  if (!invoice || invoice.userId !== userId) return null

  if (input.cardId) {
    const card = await db.card.findUnique({ where: { id: input.cardId } })
    if (!card || card.userId !== userId) return null
  }

  return db.cardInvoice.update({
    where: { id },
    data: {
      ...(input.cardId !== undefined && { cardId: input.cardId }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.status !== undefined && { status: input.status }),
      paidAt:
        input.status === "PAID"
          ? input.paidAt ?? invoice.paidAt ?? new Date()
          : input.status === "PENDING"
            ? null
            : input.paidAt,
    },
    include: { card: true },
  })
}

export async function deleteCardInvoice(
  id: string,
  userId: string,
  client?: PrismaClient
) {
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
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma

  const sourceInvoices = await db.cardInvoice.findMany({
    where: { userId, month: fromMonth },
  })

  if (sourceInvoices.length === 0) return []

  const financialMonth = await ensureFinancialMonth(userId, toMonth, db)

  await db.cardInvoice.deleteMany({
    where: { userId, month: toMonth },
  })

  const created = []
  for (const invoice of sourceInvoices) {
    const newInvoice = await db.cardInvoice.create({
      data: {
        cardId: invoice.cardId,
        financialMonthId: financialMonth.id,
        month: toMonth,
        dueDate: invoice.dueDate,
        amount: invoice.amount,
        status: "PENDING",
        userId,
      },
      include: { card: true },
    })
    created.push(newInvoice)
  }

  return created
}
