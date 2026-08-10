// @vitest-environment node
import { describe, it, expect } from "vitest"
import { getTestClient } from "@/__tests__/prisma"

const testPrisma = getTestClient()

describe("Prisma Schema — banco de teste", () => {

  it("tabela User existe e aceita insert", async () => {
    const user = await testPrisma.user.create({
      data: {
        id: "test_schema_01",
        email: "schema@test.com",
        name: "Schema Test",
      },
    })
    expect(user.email).toBe("schema@test.com")
    await testPrisma.user.delete({ where: { id: user.id } })
  })

  it("tabela Category existe e aceita insert", async () => {
    const user = await testPrisma.user.create({
      data: { id: "test_schema_02", email: "cat@test.com" },
    })
    const cat = await testPrisma.category.create({
      data: { name: "Teste", userId: user.id, type: "EXPENSE" },
    })
    expect(cat.name).toBe("Teste")
    await testPrisma.category.delete({ where: { id: cat.id } })
    await testPrisma.user.delete({ where: { id: user.id } })
  })

  it("tabela Transaction existe e aceita insert", async () => {
    const user = await testPrisma.user.create({
      data: { id: "test_schema_03", email: "tx@test.com" },
    })
    const cat = await testPrisma.category.create({
      data: { name: "Cat", userId: user.id, type: "EXPENSE" },
    })
    const tx = await testPrisma.transaction.create({
      data: {
        amount: 99.9,
        type: "EXPENSE",
        categoryId: cat.id,
        userId: user.id,
        date: new Date(),
      },
    })
    expect(tx.amount.toNumber()).toBe(99.9)
    await testPrisma.transaction.delete({ where: { id: tx.id } })
    await testPrisma.category.delete({ where: { id: cat.id } })
    await testPrisma.user.delete({ where: { id: user.id } })
  })

  it("tabela Budget existe e aceita insert", async () => {
    const user = await testPrisma.user.create({
      data: { id: "test_schema_04", email: "budget@test.com" },
    })
    const cat = await testPrisma.category.create({
      data: { name: "Cat", userId: user.id, type: "EXPENSE" },
    })
    const budget = await testPrisma.budget.create({
      data: {
        amount: 1000,
        month: "2026-06",
        categoryId: cat.id,
        userId: user.id,
      },
    })
    expect(budget.amount.toNumber()).toBe(1000)
    await testPrisma.budget.delete({ where: { id: budget.id } })
    await testPrisma.category.delete({ where: { id: cat.id } })
    await testPrisma.user.delete({ where: { id: user.id } })
  })

  it("tabela MonthlyPlan preserva configuração mensal em Decimal", async () => {
    await testPrisma.monthlyPlan.deleteMany({ where: { userId: "test_schema_05" } })
    await testPrisma.user.deleteMany({ where: { id: "test_schema_05" } })
    const user = await testPrisma.user.create({
      data: { id: "test_schema_05", email: "monthly-plan@test.com" },
    })
    const monthlyPlan = await testPrisma.monthlyPlan.create({
      data: {
        month: "2026-08",
        incomeOverride: 1500,
        savingsGoal: 300,
        safetyMargin: 50,
        userId: user.id,
      },
    })

    expect(monthlyPlan.incomeOverride?.toNumber()).toBe(1500)
    expect(monthlyPlan.savingsGoal.toNumber()).toBe(300)
    expect(monthlyPlan.safetyMargin.toNumber()).toBe(50)

    await testPrisma.monthlyPlan.delete({ where: { id: monthlyPlan.id } })
    await testPrisma.user.delete({ where: { id: user.id } })
  })
})
