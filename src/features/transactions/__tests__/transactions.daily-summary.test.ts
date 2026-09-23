// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createCategory } from "@/features/categories/categories.service"
import { getTransactionDailySummary } from "@/features/transactions/transactions.service"

const testPrisma = getTestClient()

describe("Transactions Daily Summary", () => {
  let userAId: string
  let userBId: string
  let categoryId: string
  let otherCategoryId: string
  let incomeCategoryId: string

  beforeAll(async () => {
    const stamp = Date.now()
    const rA = await registerUser(
      { name: "Daily A", email: `daily-a-${stamp}@test.com`, password: "Senha123" },
      testPrisma
    )
    const rB = await registerUser(
      { name: "Daily B", email: `daily-b-${stamp}@test.com`, password: "Senha123" },
      testPrisma
    )
    userAId = ("user" in rA ? rA.user : null)?.id ?? ""
    userBId = ("user" in rB ? rB.user : null)?.id ?? ""

    const category = await createCategory(
      userAId,
      { name: "Mercado", type: "EXPENSE", icon: "wallet", color: "#0EA882" },
      testPrisma
    )
    const otherCategory = await createCategory(
      userAId,
      { name: "Transporte", type: "EXPENSE", icon: "wallet", color: "#0EA882" },
      testPrisma
    )
    const incomeCategory = await createCategory(
      userAId,
      { name: "Salário", type: "INCOME", icon: "wallet", color: "#0EA882" },
      testPrisma
    )
    const categoryB = await createCategory(
      userBId,
      { name: "Mercado B", type: "EXPENSE", icon: "wallet", color: "#0EA882" },
      testPrisma
    )
    categoryId = category.id
    otherCategoryId = otherCategory.id
    incomeCategoryId = incomeCategory.id

    await testPrisma.transaction.createMany({
      data: [
        { userId: userAId, type: "EXPENSE", amount: 100, date: new Date(2026, 8, 3, 12), categoryId },
        { userId: userAId, type: "EXPENSE", amount: 50, date: new Date(2026, 8, 3, 18), categoryId },
        { userId: userAId, type: "EXPENSE", amount: 30, date: new Date(2026, 8, 10, 9), categoryId: otherCategoryId },
        { userId: userAId, type: "INCOME", amount: 500, date: new Date(2026, 8, 3, 8), categoryId: incomeCategoryId },
        { userId: userBId, type: "EXPENSE", amount: 999, date: new Date(2026, 8, 3, 12), categoryId: categoryB.id },
      ],
    })
  })

  afterAll(async () => {
    await testPrisma.transaction.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await testPrisma.category.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await testPrisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
  })

  it("agrupa as despesas por dia do mês, preenchendo os dias vazios", async () => {
    const summary = await getTransactionDailySummary(
      userAId,
      { month: "2026-09", type: "EXPENSE" },
      testPrisma
    )

    expect(summary.days).toHaveLength(30)
    expect(summary.days[0]).toMatchObject({ day: 1, total: 0, count: 0 })
    expect(summary.days[2]).toMatchObject({ day: 3, total: 150, count: 2 })
    expect(summary.days[9]).toMatchObject({ day: 10, total: 30, count: 1 })
    expect(summary.total).toBe(180)
    expect(summary.count).toBe(3)
    expect(summary.income).toBe(500)
    expect(summary.expense).toBe(180)
  })

  it("filtra por categoria", async () => {
    const summary = await getTransactionDailySummary(
      userAId,
      { month: "2026-09", type: "EXPENSE", categoryId },
      testPrisma
    )

    expect(summary.total).toBe(150)
    expect(summary.count).toBe(2)
    expect(summary.days[2]).toMatchObject({ day: 3, total: 150, count: 2 })
    expect(summary.days[9]).toMatchObject({ day: 10, total: 0, count: 0 })
    expect(summary.income).toBe(0)
    expect(summary.expense).toBe(150)
  })

  it("resume receitas quando o tipo é INCOME", async () => {
    const summary = await getTransactionDailySummary(
      userAId,
      { month: "2026-09", type: "INCOME" },
      testPrisma
    )

    expect(summary.total).toBe(500)
    expect(summary.count).toBe(1)
    expect(summary.days[2]).toMatchObject({ day: 3, total: 500, count: 1 })
    expect(summary.income).toBe(500)
    expect(summary.expense).toBe(180)
  })

  it("assume despesas quando o tipo não é informado", async () => {
    const summary = await getTransactionDailySummary(userAId, { month: "2026-09" }, testPrisma)

    expect(summary.total).toBe(180)
    expect(summary.count).toBe(3)
    expect(summary.days[2]).toMatchObject({ day: 3, total: 150, count: 2 })
  })

  it("não mistura transações de outro usuário", async () => {
    const summary = await getTransactionDailySummary(
      userAId,
      { month: "2026-09", type: "EXPENSE" },
      testPrisma
    )

    expect(summary.days[2]).toMatchObject({ day: 3, total: 150, count: 2 })
    expect(summary.total).toBe(180)
    expect(summary.expense).toBe(180)
    expect(summary.income).toBe(500)
  })
})
