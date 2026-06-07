// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createCategory } from "@/features/categories/categories.service"
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/features/transactions/transactions.service"

const testPrisma = getTestClient()

describe("Transactions Service", () => {
  let userAId: string
  let userBId: string
  let catExpenseId: string
  let catIncomeId: string

  beforeAll(async () => {
    const rA = await registerUser(
      { name: "User A", email: "tx-api-a@test.com", password: "Senha123" },
      testPrisma
    )
    const rB = await registerUser(
      { name: "User B", email: "tx-api-b@test.com", password: "Senha123" },
      testPrisma
    )
    userAId = ("user" in rA ? rA.user : null)?.id ?? ""
    userBId = ("user" in rB ? rB.user : null)?.id ?? ""

    const catExp = await createCategory(
      userAId,
      { name: "Alimentação", type: "EXPENSE" },
      testPrisma
    )
    const catInc = await createCategory(
      userAId,
      { name: "Salário", type: "INCOME" },
      testPrisma
    )
    catExpenseId = catExp.id
    catIncomeId = catInc.id
  })

  afterAll(async () => {
    await testPrisma.transaction.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.category.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    })
  })

  it("retorna array vazio para usuário sem transações", async () => {
    const result = await getTransactions(userBId, {}, testPrisma)
    expect(result.transactions).toEqual([])
    expect(result.total).toBe(0)
  })

  it("cria transação de despesa com sucesso", async () => {
    const tx = await createTransaction(
      userAId,
      {
        amount: 150.5,
        type: "EXPENSE",
        description: "Supermercado",
        categoryId: catExpenseId,
        date: new Date("2026-06-04T12:00:00"),
      },
      testPrisma
    )
    expect(tx.amount).toBe(150.5)
    expect(tx.type).toBe("EXPENSE")
    expect(tx.category.name).toBe("Alimentação")
  })

  it("retorna transações com paginação", async () => {
    for (let i = 0; i < 5; i++) {
      await createTransaction(
        userAId,
        {
          amount: 30 + i,
          type: "EXPENSE",
          categoryId: catExpenseId,
          date: new Date("2026-06-04T12:00:00"),
        },
        testPrisma
      )
    }
    const result = await getTransactions(
      userAId,
      { page: 1, limit: 3 },
      testPrisma
    )
    expect(result.transactions.length).toBe(3)
    expect(result.total).toBeGreaterThanOrEqual(6)
  })

  it("filtra por tipo (só receitas)", async () => {
    await createTransaction(
      userAId,
      {
        amount: 5000,
        type: "INCOME",
        categoryId: catIncomeId,
        date: new Date("2026-06-04T12:00:00"),
      },
      testPrisma
    )
    const result = await getTransactions(
      userAId,
      { type: "INCOME" },
      testPrisma
    )
    expect(result.transactions.every((t) => t.type === "INCOME")).toBe(true)
  })

  it("atualiza transação pelo id", async () => {
    const txs = await getTransactions(userAId, {}, testPrisma)
    const first = txs.transactions[0]
    const updated = await updateTransaction(
      first.id,
      userAId,
      { amount: 999.99, description: "Atualizado" },
      testPrisma
    )
    expect(updated?.amount).toBe(999.99)
    expect(updated?.description).toBe("Atualizado")
  })

  it("deleta transação com sucesso", async () => {
    const tx = await createTransaction(
      userAId,
      {
        amount: 10,
        type: "EXPENSE",
        categoryId: catExpenseId,
        date: new Date(),
      },
      testPrisma
    )
    const deleted = await deleteTransaction(tx.id, userAId, testPrisma)
    expect(deleted).toBe(true)

    const exists = await testPrisma.transaction.findUnique({
      where: { id: tx.id },
    })
    expect(exists).toBeNull()
  })

  it("tenant isolation — User B não vê transações do User A", async () => {
    const result = await getTransactions(userBId, {}, testPrisma)
    expect(result.transactions).toEqual([])
  })

  it("atualização de outro user retorna null", async () => {
    const txs = await getTransactions(userAId, {}, testPrisma)
    const result = await updateTransaction(
      txs.transactions[0].id,
      userBId,
      { amount: 1 },
      testPrisma
    )
    expect(result).toBeNull()
  })
})
