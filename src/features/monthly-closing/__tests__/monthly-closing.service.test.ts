// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { getMonthlyClosing } from "../monthly-closing.service"

const prisma = getTestClient()

describe("monthly-closing.service", () => {
  let userId = ""
  let categoryId = ""

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Closing User", email: `closing-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""

    const category = await prisma.category.create({
      data: { name: `Fechamento ${Date.now()}`, userId, type: "EXPENSE" },
    })
    categoryId = category.id
  })

  afterAll(async () => {
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.cardInvoice.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it("calcula fechamento sem duplicar custo fixo dentro do cartão", async () => {
    const month = "2026-06"
    const card = await prisma.card.create({ data: { name: `Nubank ${Date.now()}`, userId } })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })

    await prisma.fixedCost.createMany({
      data: [
        { name: `Internet ${Date.now()}`, defaultAmount: 120, categoryId, paymentMethod: "PIX", paidInsideCard: false, userId },
        { name: `Streaming ${Date.now()}`, defaultAmount: 50, categoryId, paymentMethod: "CREDIT_CARD", paidInsideCard: true, cardId: card.id, userId },
      ],
    })
    await prisma.cardInvoice.create({
      data: { cardId: card.id, financialMonthId: financialMonth.id, month, dueDate: new Date("2026-06-10T12:00:00"), amount: 300, userId },
    })
    await prisma.transaction.createMany({
      data: [
        { amount: 80, type: "EXPENSE", categoryId, userId, date: new Date("2026-06-05T12:00:00") },
        { amount: 1000, type: "INCOME", categoryId, userId, date: new Date("2026-06-06T12:00:00") },
      ],
    })

    const closing = await getMonthlyClosing(userId, month, prisma)

    expect(closing.summary.cardInvoicesTotal).toBe(300)
    expect(closing.summary.fixedCostsOutsideCardTotal).toBe(120)
    expect(closing.summary.fixedCostsInsideCardTotal).toBe(50)
    expect(closing.summary.looseExpensesTotal).toBe(80)
    expect(closing.summary.incomeTotal).toBe(1000)
    expect(closing.summary.totalToPay).toBe(500)
    expect(closing.summary.projectedBalance).toBe(500)
    expect(closing.summary.estimatedInvoicesByCard[0]?.estimatedAmount).toBe(50)
  })
})
