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
    expect(tx.amount).toBe(99.9)
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
    expect(budget.amount).toBe(1000)
    await testPrisma.budget.delete({ where: { id: budget.id } })
    await testPrisma.category.delete({ where: { id: cat.id } })
    await testPrisma.user.delete({ where: { id: user.id } })
  })
})
