// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createCard } from "@/features/cards/cards.service"
import { createCardInvoice } from "@/features/card-invoices/card-invoices.service"
import { createFixedCost } from "@/features/fixed-costs/fixed-costs.service"
import { getDueSoonNotifications } from "../notifications.service"

const prisma = getTestClient()

describe("notifications.service", () => {
  let userId = ""
  let categoryId = ""

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Notify User", email: `notify-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
    const category = await prisma.category.create({
      data: { name: `Notify Category ${Date.now()}`, type: "EXPENSE", icon: "bell", color: "#22C55E", userId },
    })
    categoryId = category.id
  })

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } })
  })

  it("lista faturas pendentes próximas e ignora faturas pagas", async () => {
    const card = await createCard(
      userId,
      { name: `Notify Card ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 10, dueDay: 20, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-06", dueDate: new Date("2026-06-05T12:00:00"), amount: 100, status: "PENDING" },
      prisma
    )
    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-07", dueDate: new Date("2026-06-06T12:00:00"), amount: 200, status: "PAID" },
      prisma
    )

    const notifications = await getDueSoonNotifications(userId, 7, prisma, new Date("2026-06-01T12:00:00"))

    expect(notifications.some((item) => item.type === "INVOICE" && item.amount === 100)).toBe(true)
    expect(notifications.some((item) => item.type === "INVOICE" && item.amount === 200)).toBe(false)
  })

  it("lista custo fixo pendente com dia de vencimento", async () => {
    const created = await createFixedCost(
      userId,
      { type: "EXPENSE" as const, name: `Internet Notify ${Date.now()}`, defaultAmount: 150, categoryId, paymentMethod: "PIX", dueDay: 5, paidInsideCard: false, cardId: null, bankAccountId: null, active: true, startDate: "2026-01-01", frequency: "MONTHLY", endType: "NONE" },
      prisma
    )
    if (!created) return

    const juneFM = await prisma.financialMonth.upsert({
      where: { month_userId: { month: "2026-06", userId } },
      create: { month: "2026-06", userId },
      update: {},
    })
    await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: created.id, financialMonthId: juneFM.id, month: "2026-06", dueDate: new Date("2026-06-05T12:00:00"), amount: 150, status: "PENDING", userId },
    })

    const notifications = await getDueSoonNotifications(userId, 7, prisma, new Date("2026-06-01T12:00:00"))

    expect(notifications.some((item) => item.type === "FIXED_COST" && item.amount === 150 && item.dueDate.startsWith("2026-06-05"))).toBe(true)
  })

  it("ajusta vencimento dia 31 para último dia de mês curto", async () => {
    const created = await createFixedCost(
      userId,
      { type: "EXPENSE" as const, name: `Fevereiro Notify ${Date.now()}`, defaultAmount: 90, categoryId, paymentMethod: "BANK_SLIP", dueDay: 31, paidInsideCard: false, cardId: null, bankAccountId: null, active: true, startDate: "2026-01-01", frequency: "MONTHLY", endType: "NONE" },
      prisma
    )
    if (!created) return

    const febFM = await prisma.financialMonth.upsert({
      where: { month_userId: { month: "2026-02", userId } },
      create: { month: "2026-02", userId },
      update: {},
    })
    await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: created.id, financialMonthId: febFM.id, month: "2026-02", dueDate: new Date("2026-02-28T12:00:00"), amount: 90, status: "PENDING", userId },
    })

    const notifications = await getDueSoonNotifications(userId, 7, prisma, new Date("2026-02-26T12:00:00"))

    expect(notifications.some((item) => item.type === "FIXED_COST" && item.amount === 90 && item.dueDate.startsWith("2026-02-28"))).toBe(true)
  })

  it("usa o vencimento da ocorrência quando diferente do dia padrão do série", async () => {
    const created = await createFixedCost(
      userId,
      { type: "EXPENSE" as const, name: `Opencode Notify ${Date.now()}`, defaultAmount: 55, categoryId, paymentMethod: "PIX", dueDay: 1, paidInsideCard: false, cardId: null, bankAccountId: null, active: true, startDate: "2026-01-01", frequency: "MONTHLY", endType: "NONE" },
      prisma
    )
    if (!created) return

    const sepFM = await prisma.financialMonth.upsert({
      where: { month_userId: { month: "2026-09", userId } },
      create: { month: "2026-09", userId },
      update: {},
    })
    await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: created.id, financialMonthId: sepFM.id, month: "2026-09", dueDate: new Date("2026-09-16T12:00:00"), amount: 55, status: "PENDING", userId },
    })
    await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: created.id, financialMonthId: sepFM.id, month: "2026-09", scheduledDate: new Date("2026-09-01T12:00:00"), dueDate: new Date("2026-09-01T12:00:00"), amount: 55, status: "PENDING", userId },
    })

    const notifications = await getDueSoonNotifications(userId, 7, prisma, new Date("2026-09-10T12:00:00"))

    expect(notifications.some((item) => item.type === "FIXED_COST" && item.amount === 55 && item.dueDate.startsWith("2026-09-16"))).toBe(true)
    expect(notifications.some((item) => item.type === "FIXED_COST" && item.amount === 55 && item.dueDate.startsWith("2026-09-01"))).toBe(false)
  })
})
