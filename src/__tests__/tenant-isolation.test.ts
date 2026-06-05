// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"

const testPrisma = getTestClient()

describe("Tenant Isolation", () => {
  let userAId: string
  let userBId: string
  let catAId: string

  beforeAll(async () => {
    const rA = await registerUser(
      {
        name: "User A",
        email: "a@isolation.test",
        password: "Senha123",
      },
      testPrisma
    )
    const rB = await registerUser(
      {
        name: "User B",
        email: "b@isolation.test",
        password: "Senha123",
      },
      testPrisma
    )

    userAId = ("user" in rA ? rA.user : null)?.id ?? ""
    userBId = ("user" in rB ? rB.user : null)?.id ?? ""

    const cat = await testPrisma.category.create({
      data: { name: "Cat A", userId: userAId, type: "EXPENSE" },
    })
    catAId = cat.id

    await testPrisma.transaction.create({
      data: {
        amount: 100,
        type: "EXPENSE",
        categoryId: catAId,
        userId: userAId,
        date: new Date(),
      },
    })
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

  it("User A vê suas próprias transações", async () => {
    const txs = await testPrisma.transaction.findMany({
      where: { userId: userAId },
    })
    expect(txs.length).toBeGreaterThanOrEqual(1)
  })

  it("User B não vê transações do User A", async () => {
    const txs = await testPrisma.transaction.findMany({
      where: { userId: userBId },
    })
    expect(txs.length).toBe(0)
  })

  it("query sem filtro de userId entrega dados de ambos (sem middleware)", async () => {
    const all = await testPrisma.transaction.findMany()
    const aTxs = all.filter((t) => t.userId === userAId)
    const bTxs = all.filter((t) => t.userId === userBId)
    expect(aTxs.length).toBeGreaterThanOrEqual(1)
    expect(bTxs.length).toBe(0)
  })
})
