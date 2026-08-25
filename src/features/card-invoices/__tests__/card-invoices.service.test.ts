// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { createCard } from "@/features/cards/cards.service"
import { copyCardInvoices, createCardInvoice, createCardInvoiceItem, getCardInvoices, updateCardInvoice } from "../card-invoices.service"

const prisma = getTestClient()

function monthKey(year: number, month1Based: number) {
  return `${year}-${String(month1Based).padStart(2, "0")}`
}

function offsetMonth(base: Date, offset: number) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    monthZero: d.getUTCMonth(),
    key: monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1),
    lastDay: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(),
  }
}

function dueDateFor(month: { year: number; monthZero: number; lastDay: number }, day: number) {
  return new Date(Date.UTC(month.year, month.monthZero, Math.min(day, month.lastDay)))
}

function findOverflowPair(base: Date) {
  for (let i = 0; i < 12; i++) {
    const src = offsetMonth(base, i)
    const tgt = offsetMonth(base, i + 1)
    if (src.lastDay === 31 && tgt.lastDay < 31) return { src, tgt }
  }
  const src = offsetMonth(base, 0)
  const tgt = offsetMonth(base, 1)
  return { src, tgt }
}

describe("card-invoices.service", () => {
  const userId = "user_card_invoice_copy_test"
  const now = new Date()

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, name: "Card Copy Tester", email: `card-copy-${Date.now()}@test.com` },
    })
  })

  afterAll(async () => {
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.cardInvoice.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { userId } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it("copia fatura atualizando vencimento para o mês destino", async () => {
    const src = offsetMonth(now, -2)
    const tgt = offsetMonth(now, -1)
    const card = await createCard(
      userId,
      { name: `Copy Card ${Date.now()}`, brand: "Mastercard", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: src.key, dueDate: dueDateFor(src, 15), amount: 1234, status: "PAID" },
      prisma
    )

    const copied = await copyCardInvoices(src.key, tgt.key, userId, prisma)

    expect(copied).toHaveLength(1)
    expect(copied[0].month).toBe(tgt.key)
    expect(copied[0].status).toBe("PENDING")
    expect(copied[0].dueDate.toISOString().slice(0, 10)).toBe(dueDateFor(tgt, 15).toISOString().slice(0, 10))
  })

  it("limita vencimento ao último dia do mês destino", async () => {
    const baseShifted = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1))
    const { src, tgt } = findOverflowPair(baseShifted)
    const card = await createCard(
      userId,
      { name: `Short Month Card ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 5, dueDay: 31, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: src.key, dueDate: dueDateFor(src, 31), amount: 999, status: "PENDING" },
      prisma
    )

    const copied = await copyCardInvoices(src.key, tgt.key, userId, prisma)
    const invoice = copied.find((item) => item.cardId === card.id)

    const expected = dueDateFor(tgt, 31).toISOString().slice(0, 10)
    expect(invoice?.dueDate.toISOString().slice(0, 10)).toBe(expected)
    expect(invoice?.dueDate.getUTCDate()).toBe(Math.min(31, tgt.lastDay))
  })

  it("preserva faturas de outros cartões ao copiar apenas uma fatura (invoiceIds)", async () => {
    const src = offsetMonth(now, -5)
    const tgt = offsetMonth(now, -4)
    const keepCard = await createCard(
      userId,
      { name: `Keep Card ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    const sourceCard = await createCard(
      userId,
      { name: `Selective Source Card ${Date.now()}`, brand: "Mastercard", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(keepCard).not.toBeNull()
    expect(sourceCard).not.toBeNull()
    if (!keepCard || !sourceCard) return

    const sourceInvoice = await createCardInvoice(
      userId,
      { cardId: sourceCard.id, month: src.key, dueDate: dueDateFor(src, 15), amount: 200, status: "PAID" },
      prisma
    )
    expect(sourceInvoice).not.toBeNull()
    if (!sourceInvoice) return

    await createCardInvoice(
      userId,
      { cardId: keepCard.id, month: tgt.key, dueDate: dueDateFor(tgt, 15), amount: 50, status: "PENDING" },
      prisma
    )

    const beforeCount = await prisma.cardInvoice.count({ where: { userId, month: tgt.key } })
    expect(beforeCount).toBe(1)

    const copied = await copyCardInvoices(src.key, tgt.key, userId, prisma, [sourceInvoice.id])

    expect(copied).toHaveLength(1)
    expect(copied[0].month).toBe(tgt.key)
    expect(copied[0].cardId).toBe(sourceCard.id)

    const after = await getCardInvoices(userId, tgt.key, prisma)
    expect(after).toHaveLength(2)
    expect(after.some((invoice) => invoice.cardId === keepCard.id)).toBe(true)
    expect(after.some((invoice) => invoice.cardId === sourceCard.id)).toBe(true)
  })

  it("substitui fatura existente do mesmo cartão ao copiar de forma seletiva", async () => {
    const src = offsetMonth(now, 20)
    const tgt = offsetMonth(now, 21)
    const sourceCard = await createCard(
      userId,
      { name: `Replace Same Card ${Date.now()}`, brand: "Mastercard", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(sourceCard).not.toBeNull()
    if (!sourceCard) return

    const sourceInvoice = await createCardInvoice(
      userId,
      { cardId: sourceCard.id, month: src.key, dueDate: dueDateFor(src, 15), amount: 200, status: "PAID" },
      prisma
    )
    expect(sourceInvoice).not.toBeNull()
    if (!sourceInvoice) return

    await createCardInvoice(
      userId,
      { cardId: sourceCard.id, month: tgt.key, dueDate: dueDateFor(tgt, 15), amount: 80, status: "PENDING" },
      prisma
    )

    const copied = await copyCardInvoices(src.key, tgt.key, userId, prisma, [sourceInvoice.id])

    expect(copied).toHaveLength(1)
    const after = (await getCardInvoices(userId, tgt.key, prisma)).filter((invoice) => invoice.cardId === sourceCard.id)
    expect(after).toHaveLength(1)
    expect(Number(after[0].amount)).toBe(200)
  })

  it("diferencia total informado de cálculo por lançamentos", async () => {
    const tgt = offsetMonth(now, 30)
    const card = await prisma.card.create({ data: { name: `Modes ${Date.now()}`, userId } })
    const category = await prisma.category.create({ data: { name: `Modes ${Date.now()}`, type: "EXPENSE", userId } })
    const financialMonth = await prisma.financialMonth.create({ data: { month: tgt.key, userId } })
    const [netflix, academy] = await Promise.all([
      prisma.fixedCost.create({ data: { name: `Netflix ${Date.now()}`, defaultAmount: 40, categoryId: category.id, paymentMethod: "CREDIT_CARD", paidInsideCard: true, cardId: card.id, userId } }),
      prisma.fixedCost.create({ data: { name: `Academia ${Date.now()}`, defaultAmount: 100, categoryId: category.id, paymentMethod: "CREDIT_CARD", paidInsideCard: true, cardId: card.id, userId } }),
    ])
    await prisma.fixedCostOccurrence.createMany({ data: [
      { fixedCostId: netflix.id, financialMonthId: financialMonth.id, month: tgt.key, amount: 40, userId },
      { fixedCostId: academy.id, financialMonthId: financialMonth.id, month: tgt.key, amount: 100, userId },
    ] })

    const created = await createCardInvoice(userId, {
      cardId: card.id,
      month: tgt.key,
      dueDate: dueDateFor(tgt, 15),
      amount: 500,
      enteredTotal: 500,
      calculationMode: "ENTERED_TOTAL",
    }, prisma)
    expect(created?.effectiveTotal).toBe(500)
    if (!created) return

    await updateCardInvoice(created.id, userId, { calculationMode: "CALCULATED" }, prisma)
    await createCardInvoiceItem(created.id, userId, {
      description: "Outras compras",
      amount: 500,
      kind: "MANUAL",
      postingStatus: "POSTED",
    }, prisma)

    const calculated = (await getCardInvoices(userId, tgt.key, prisma))[0]
    expect(calculated.effectiveTotal).toBe(640)
    expect(calculated.enteredTotal).toBe(500)
  })
})
