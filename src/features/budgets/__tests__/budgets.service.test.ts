// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
} from "../budgets.service"

const prisma = getTestClient()

describe("Budgets Service", () => {
  const userId = "user_budget_test"
  let catId: string

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, name: "Budget Tester", email: `budget-${Date.now()}@test.com` },
    })
    const cat = await prisma.category.create({
      data: { name: "Alimentação", type: "EXPENSE", color: "#E85D5D", icon: "UtensilsCrossed", userId },
    })
    catId = cat.id
  })

  afterAll(async () => {
    await prisma.budget.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
  })

  it("cria um orçamento", async () => {
    const budget = await createBudget(userId, { amount: 800, month: "2026-06", categoryId: catId }, prisma)
    expect(budget.amount).toBe(800)
    expect(budget.month).toBe("2026-06")
    expect(budget.category.name).toBe("Alimentação")
  })

  it("retorna orçamentos do mês", async () => {
    const budgets = await getBudgets(userId, "2026-06", prisma)
    expect(budgets.length).toBeGreaterThanOrEqual(1)
    expect(budgets[0].category).toBeDefined()
  })

  it("atualiza um orçamento", async () => {
    const budgets = await getBudgets(userId, "2026-06", prisma)
    const updated = await updateBudget(budgets[0].id, userId, { amount: 1000 }, prisma)
    expect(updated?.amount).toBe(1000)
  })

  it("retorna null para update de orçamento de outro usuário", async () => {
    const budgets = await getBudgets(userId, "2026-06", prisma)
    const result = await updateBudget(budgets[0].id, "user_other", { amount: 500 }, prisma)
    expect(result).toBeNull()
  })

  it("calcula resumo com gastos", async () => {
    await prisma.transaction.create({
      data: { amount: 300, type: "EXPENSE", date: new Date(2026, 5, 10, 12, 0, 0), categoryId: catId, userId },
    })

    const summary = await getBudgetSummary(userId, "2026-06", prisma)
    expect(summary.length).toBe(1)
    expect(summary[0].spent).toBe(300)
    expect(summary[0].remaining).toBe(700)
    expect(summary[0].percentage).toBe(30)
  })

  it("exclui um orçamento", async () => {
    const budgets = await getBudgets(userId, "2026-06", prisma)
    const deleted = await deleteBudget(budgets[0].id, userId, prisma)
    expect(deleted).toBe(true)

    const after = await getBudgets(userId, "2026-06", prisma)
    expect(after.length).toBe(0)
  })

  it("retorna false para delete de orçamento inexistente", async () => {
    const result = await deleteBudget("nonexistent", userId, prisma)
    expect(result).toBe(false)
  })
})
