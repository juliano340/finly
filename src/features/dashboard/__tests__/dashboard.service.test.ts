// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { getDashboardStats } from "../dashboard.service"

const prisma = getTestClient()

describe("Dashboard Service", () => {
  const userId = "user_dash_test"
  const otherUserId = "user_other_test"

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, name: "Dash Tester", email: `dash-${Date.now()}@test.com` },
    })

    const catExpense = await prisma.category.create({
      data: { name: "Alimentação", type: "EXPENSE", color: "#E85D5D", icon: "UtensilsCrossed", userId },
    })
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
    await prisma.transaction.deleteMany({ where: { userId: { in: [userId, otherUserId] } } })
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
})
