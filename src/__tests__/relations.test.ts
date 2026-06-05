// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"

const testPrisma = getTestClient()

describe("Relacionamentos — Prisma", () => {
  let userId: string
  let categoryId: string
  let transactionId: string
  let budgetId: string

  beforeAll(async () => {
    const user = await testPrisma.user.create({
      data: { id: "rel_user", email: "rel@test.com", name: "Rel" },
    })
    userId = user.id

    const category = await testPrisma.category.create({
      data: { name: "Alimentação", userId, type: "EXPENSE" },
    })
    categoryId = category.id

    const transaction = await testPrisma.transaction.create({
      data: {
        amount: 150.5,
        type: "EXPENSE",
        description: "Supermercado",
        categoryId,
        userId,
        date: new Date("2026-06-04T12:00:00"),
      },
    })
    transactionId = transaction.id

    const budget = await testPrisma.budget.create({
      data: { amount: 800, month: "2026-06", categoryId, userId },
    })
    budgetId = budget.id
  })

  afterAll(async () => {
    await testPrisma.budget.deleteMany({ where: { userId } })
    await testPrisma.transaction.deleteMany({ where: { userId } })
    await testPrisma.category.deleteMany({ where: { userId } })
    await testPrisma.user.delete({ where: { id: userId } })
  })

  it("transaction.category carrega a categoria correta", async () => {
    const tx = await testPrisma.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true },
    })
    expect(tx?.category.name).toBe("Alimentação")
  })

  it("transaction.user carrega o usuário correto", async () => {
    const tx = await testPrisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    })
    expect(tx?.user.email).toBe("rel@test.com")
  })

  it("category.transactions lista as transações", async () => {
    const cat = await testPrisma.category.findUnique({
      where: { id: categoryId },
      include: { transactions: true },
    })
    expect(cat?.transactions.length).toBeGreaterThanOrEqual(1)
  })

  it("category.budgets lista os orçamentos", async () => {
    const cat = await testPrisma.category.findUnique({
      where: { id: categoryId },
      include: { budgets: true },
    })
    expect(cat?.budgets.length).toBe(1)
    expect(cat?.budgets[0].amount).toBe(800)
  })

  it("budget.category carrega a categoria", async () => {
    const budget = await testPrisma.budget.findUnique({
      where: { id: budgetId },
      include: { category: true },
    })
    expect(budget?.category.name).toBe("Alimentação")
  })

  it("onDelete Cascade — deletar user remove transações", async () => {
    const tempUser = await testPrisma.user.create({
      data: { id: "temp_cascade", email: "cascade@test.com" },
    })
    const tempCat = await testPrisma.category.create({
      data: { name: "Temp", userId: tempUser.id, type: "EXPENSE" },
    })
    await testPrisma.transaction.create({
      data: {
        amount: 10,
        type: "EXPENSE",
        categoryId: tempCat.id,
        userId: tempUser.id,
        date: new Date(),
      },
    })

    await testPrisma.user.delete({ where: { id: tempUser.id } })

    const remainingTx = await testPrisma.transaction.findFirst({
      where: { userId: tempUser.id },
    })
    expect(remainingTx).toBeNull()
  })
})
