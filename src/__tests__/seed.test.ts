// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"

const testPrisma = getTestClient()

describe("Seed — dados iniciais", () => {
  let userId: string
  let categoryCount: number
  let transactionCount: number

  beforeAll(async () => {
    const user = await testPrisma.user.create({
      data: {
        id: "demo_user_seed",
        email: "demo@finly.app",
        name: "Usuário Demo",
      },
    })
    userId = user.id

    const categories = [
      { name: "Alimentação", icon: "utensils", color: "#E85D5D", type: "EXPENSE" as const },
      { name: "Transporte", icon: "car", color: "#F59E0B", type: "EXPENSE" as const },
      { name: "Moradia", icon: "home", color: "#3B82F6", type: "EXPENSE" as const },
      { name: "Lazer", icon: "gamepad", color: "#8B5CF6", type: "EXPENSE" as const },
      { name: "Saúde", icon: "heart", color: "#EC4899", type: "EXPENSE" as const },
      { name: "Educação", icon: "book", color: "#14B8A6", type: "EXPENSE" as const },
      { name: "Assinaturas", icon: "repeat", color: "#6366F1", type: "EXPENSE" as const },
      { name: "Compras", icon: "shopping-bag", color: "#F97316", type: "EXPENSE" as const },
      { name: "Salário", icon: "briefcase", color: "#0EA882", type: "INCOME" as const },
      { name: "Freelance", icon: "laptop", color: "#22C55E", type: "INCOME" as const },
    ]

    const createdCategories = await Promise.all(
      categories.map((c) =>
        testPrisma.category.create({ data: { ...c, userId } })
      )
    )

    categoryCount = createdCategories.length

    const expenseCats = createdCategories.filter((c) => c.type === "EXPENSE")
    const incomeCats = createdCategories.filter((c) => c.type === "INCOME")

    const transactions: {
      amount: number
      type: "INCOME" | "EXPENSE"
      description: string
      date: Date
      categoryId: string
      userId: string
    }[] = []

    for (let i = 0; i < 45; i++) {
      const cat = expenseCats[i % expenseCats.length]
      transactions.push({
        amount: Number((Math.random() * 500 + 20).toFixed(2)),
        type: "EXPENSE",
        description: `Gasto ${cat.name} #${i + 1}`,
        date: new Date(2026, 5, 1 + (i % 28), 12),
        categoryId: cat.id,
        userId,
      })
    }

    for (let i = 0; i < 5; i++) {
      const cat = incomeCats[i % incomeCats.length]
      transactions.push({
        amount: Number((Math.random() * 3000 + 5000).toFixed(2)),
        type: "INCOME",
        description: `Receita ${cat.name} #${i + 1}`,
        date: new Date(2026, 5, 1 + i * 6, 12),
        categoryId: cat.id,
        userId,
      })
    }

    await testPrisma.transaction.createMany({ data: transactions })
    transactionCount = transactions.length
  })

  afterAll(async () => {
    await testPrisma.transaction.deleteMany({ where: { userId } })
    await testPrisma.category.deleteMany({ where: { userId } })
    await testPrisma.user.delete({ where: { id: userId } })
  })

  it("cria 1 usuário demo", async () => {
    const user = await testPrisma.user.findUnique({ where: { id: userId } })
    expect(user).not.toBeNull()
    expect(user!.email).toBe("demo@finly.app")
  })

  it("cria exatamente 10 categorias", () => {
    expect(categoryCount).toBe(10)
  })

  it("cria exatamente 50 transações", () => {
    expect(transactionCount).toBe(50)
  })

  it("8 categorias são de despesa, 2 de receita", async () => {
    const expenseCount = await testPrisma.category.count({
      where: { userId, type: "EXPENSE" },
    })
    const incomeCount = await testPrisma.category.count({
      where: { userId, type: "INCOME" },
    })
    expect(expenseCount).toBe(8)
    expect(incomeCount).toBe(2)
  })

  it("45 transações são de despesa, 5 de receita", async () => {
    const expenseCount = await testPrisma.transaction.count({
      where: { userId, type: "EXPENSE" },
    })
    const incomeCount = await testPrisma.transaction.count({
      where: { userId, type: "INCOME" },
    })
    expect(expenseCount).toBe(45)
    expect(incomeCount).toBe(5)
  })
})
