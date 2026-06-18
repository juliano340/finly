// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { createCard } from "@/features/cards/cards.service"
import { createCardInvoice } from "@/features/card-invoices/card-invoices.service"
import { createFixedCost } from "@/features/fixed-costs/fixed-costs.service"
import { getCardInvoiceEvolution, getDashboardStats, getMonthlyEvolution } from "../dashboard.service"

const prisma = getTestClient()

describe("Dashboard Service", () => {
  const userId = "user_dash_test"
  const otherUserId = "user_other_test"
  let expenseCategoryId = ""

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, name: "Dash Tester", email: `dash-${Date.now()}@test.com` },
    })

    const catExpense = await prisma.category.create({
      data: { name: "Alimentação", type: "EXPENSE", color: "#E85D5D", icon: "UtensilsCrossed", userId },
    })
    expenseCategoryId = catExpense.id
    const catIncome = await prisma.category.create({
      data: { name: "Salário", type: "INCOME", color: "#0EA882", icon: "Banknote", userId },
    })

    await prisma.transaction.createMany({
      data: [
        { amount: 5000, type: "INCOME", date: new Date(2026, 5, 1, 12, 0, 0), categoryId: catIncome.id, userId },
        { amount: 150, type: "EXPENSE", date: new Date(2026, 5, 5, 12, 0, 0), categoryId: catExpense.id, userId },
        { amount: 200, type: "EXPENSE", date: new Date(2026, 5, 10, 12, 0, 0), categoryId: catExpense.id, userId },
        { amount: 100, type: "EXPENSE", date: new Date(2026, 5, 15, 12, 0, 0), categoryId: catExpense.id, userId },
      ],
    })

    // Other user data
    await prisma.user.create({
      data: { id: otherUserId, name: "Other", email: `other-${Date.now()}@test.com` },
    })
    const catOther = await prisma.category.create({
      data: { name: "Lazer", type: "EXPENSE", color: "#8B5CF6", icon: "Gamepad2", userId: otherUserId },
    })
    await prisma.transaction.create({
      data: { amount: 9999, type: "EXPENSE", date: new Date(2026, 5, 20, 12, 0, 0), categoryId: catOther.id, userId: otherUserId },
    })
  })

  afterAll(async () => {
    await prisma.cardInvoice.deleteMany({ where: { userId } })
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId: { in: [userId, otherUserId] } } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId: { in: [userId, otherUserId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } })
  })

  it("retorna stats corretas para o mês", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.income).toBe(5000)
    expect(stats.expense).toBe(450)
    expect(stats.balance).toBe(4550)
  })

  it("retorna categorias de despesa agrupadas", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.byCategory).toHaveLength(1)
    expect(stats.byCategory[0].name).toBe("Alimentação")
    expect(stats.byCategory[0].value).toBe(450)
  })

  it("retorna tendência diária", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.dailyTrend.length).toBeGreaterThan(0)
    const hasIncome = stats.dailyTrend.some((d) => d.income > 0)
    const hasExpense = stats.dailyTrend.some((d) => d.expense > 0)
    expect(hasIncome).toBe(true)
    expect(hasExpense).toBe(true)
  })

  it("retorna transações recentes", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.recentTransactions).toHaveLength(4)
    expect(stats.recentTransactions[0].categoryName).toBeDefined()
  })

  it("retorna zeros para mês sem transações", async () => {
    const stats = await getDashboardStats(userId, "2026-01", prisma)

    expect(stats.balance).toBe(0)
    expect(stats.income).toBe(0)
    expect(stats.expense).toBe(0)
    expect(stats.byCategory).toHaveLength(0)
    expect(stats.dailyTrend).toHaveLength(0)
    expect(stats.recentTransactions).toHaveLength(0)
  })

  it("não mistura dados de outros usuários", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.expense).toBe(450)
    expect(stats.byCategory).toHaveLength(1)
  })

  it("retorna evolução mensal com faturas, custos fixos e avulsas", async () => {
    const card = await createCard(
      userId,
      { name: `Evolução ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-06", dueDate: new Date("2026-06-15T12:00:00"), amount: 800, status: "PENDING" },
      prisma
    )
    await createFixedCost(
      userId,
      { name: `Internet evolução ${Date.now()}`, type: "EXPENSE" as const, defaultAmount: 120, categoryId: expenseCategoryId, paymentMethod: "PIX", dueDay: 10, paidInsideCard: false, cardId: null, bankAccountId: null, active: true },
      prisma
    )

    const evolution = await getMonthlyEvolution(userId, "2026-06", 2, prisma)
    const june = evolution.months.find((item) => item.month === "2026-06")

    expect(june?.invoices).toBe(800)
    expect(june?.fixedCosts).toBeGreaterThanOrEqual(120)
    expect(june?.looseExpenses).toBe(450)
    expect(june?.total).toBe((june?.invoices ?? 0) + (june?.fixedCosts ?? 0) + (june?.looseExpenses ?? 0))
  })

  it("retorna evolução de faturas por cartão", async () => {
    const suffix = Date.now()
    const inter = await createCard(
      userId,
      { name: `Inter evolução ${suffix}`, brand: "Mastercard", color: "#f97316", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    const nubank = await createCard(
      userId,
      { name: `Nubank evolução ${suffix}`, brand: "Mastercard", color: "#8b5cf6", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(inter).not.toBeNull()
    expect(nubank).not.toBeNull()
    if (!inter || !nubank) return

    await createCardInvoice(
      userId,
      { cardId: inter.id, month: "2026-04", dueDate: new Date("2026-04-15T12:00:00"), amount: 300, status: "PENDING" },
      prisma
    )
    await createCardInvoice(
      userId,
      { cardId: inter.id, month: "2026-05", dueDate: new Date("2026-05-15T12:00:00"), amount: 500, status: "PENDING" },
      prisma
    )
    await createCardInvoice(
      userId,
      { cardId: nubank.id, month: "2026-05", dueDate: new Date("2026-05-15T12:00:00"), amount: 200, status: "PENDING" },
      prisma
    )

    const evolution = await getCardInvoiceEvolution(userId, "2026-05", 2, prisma)
    const april = evolution.months.find((item) => item.month === "2026-04")
    const may = evolution.months.find((item) => item.month === "2026-05")

    expect(evolution.cards.map((card) => card.id)).toContain(inter.id)
    expect(evolution.cards.map((card) => card.id)).toContain(nubank.id)
    expect(april?.total).toBe(300)
    expect(april?.cards[inter.id]).toBe(300)
    expect(may?.total).toBe(700)
    expect(may?.cards[inter.id]).toBe(500)
    expect(may?.cards[nubank.id]).toBe(200)
  })
})
