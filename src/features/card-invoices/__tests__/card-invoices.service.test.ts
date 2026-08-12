// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { createCard } from "@/features/cards/cards.service"
import { copyCardInvoices, createCardInvoice, createCardInvoiceItem, getCardInvoices, updateCardInvoice } from "../card-invoices.service"

const prisma = getTestClient()

describe("card-invoices.service", () => {
  const userId = "user_card_invoice_copy_test"

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
    const card = await createCard(
      userId,
      { name: `Copy Card ${Date.now()}`, brand: "Mastercard", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-06", dueDate: new Date("2026-06-15T00:00:00.000Z"), amount: 1234, status: "PAID" },
      prisma
    )

    const copied = await copyCardInvoices("2026-06", "2026-07", userId, prisma)

    expect(copied).toHaveLength(1)
    expect(copied[0].month).toBe("2026-07")
    expect(copied[0].status).toBe("PENDING")
    expect(copied[0].dueDate.toISOString().slice(0, 10)).toBe("2026-07-15")
  })

  it("limita vencimento ao último dia do mês destino", async () => {
    const card = await createCard(
      userId,
      { name: `Short Month Card ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 5, dueDay: 31, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-01", dueDate: new Date("2026-01-31T00:00:00.000Z"), amount: 999, status: "PENDING" },
      prisma
    )

    const copied = await copyCardInvoices("2026-01", "2026-02", userId, prisma)
    const invoice = copied.find((item) => item.cardId === card.id)

    expect(invoice?.dueDate.toISOString().slice(0, 10)).toBe("2026-02-28")
  })

  it("diferencia total informado de cálculo por lançamentos", async () => {
    const month = "2026-10"
    const card = await prisma.card.create({ data: { name: `Modes ${Date.now()}`, userId } })
    const category = await prisma.category.create({ data: { name: `Modes ${Date.now()}`, type: "EXPENSE", userId } })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })
    const [netflix, academy] = await Promise.all([
      prisma.fixedCost.create({ data: { name: `Netflix ${Date.now()}`, defaultAmount: 40, categoryId: category.id, paymentMethod: "CREDIT_CARD", paidInsideCard: true, cardId: card.id, userId } }),
      prisma.fixedCost.create({ data: { name: `Academia ${Date.now()}`, defaultAmount: 100, categoryId: category.id, paymentMethod: "CREDIT_CARD", paidInsideCard: true, cardId: card.id, userId } }),
    ])
    await prisma.fixedCostOccurrence.createMany({ data: [
      { fixedCostId: netflix.id, financialMonthId: financialMonth.id, month, amount: 40, userId },
      { fixedCostId: academy.id, financialMonthId: financialMonth.id, month, amount: 100, userId },
    ] })

    const created = await createCardInvoice(userId, {
      cardId: card.id,
      month,
      dueDate: new Date("2026-10-15T00:00:00.000Z"),
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

    const calculated = (await getCardInvoices(userId, month, prisma))[0]
    expect(calculated.effectiveTotal).toBe(640)
    expect(calculated.enteredTotal).toBe(500)
  })
})
