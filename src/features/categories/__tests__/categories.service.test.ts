// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/categories/categories.service"

const testPrisma = getTestClient()

describe("Categories Service (API integration)", () => {
  let userAId: string
  let userBId: string

  beforeAll(async () => {
    const rA = await registerUser(
      { name: "User A", email: "cat-api-a@test.com", password: "Senha123" },
      testPrisma
    )
    const rB = await registerUser(
      { name: "User B", email: "cat-api-b@test.com", password: "Senha123" },
      testPrisma
    )
    userAId = ("user" in rA ? rA.user : null)?.id ?? ""
    userBId = ("user" in rB ? rB.user : null)?.id ?? ""
  })

  afterAll(async () => {
    await testPrisma.category.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    })
  })

  it("retorna array vazio para usuário sem categorias", async () => {
    const cats = await getCategories(userAId, testPrisma)
    expect(cats).toEqual([])
  })

  it("cria categoria com sucesso", async () => {
    const cat = await createCategory(
      userAId,
      { name: "Alimentação", type: "EXPENSE" },
      testPrisma
    )
    expect(cat.name).toBe("Alimentação")
    expect(cat.type).toBe("EXPENSE")
    expect(cat.userId).toBe(userAId)
  })

  it("retorna categorias criadas", async () => {
    await createCategory(
      userAId,
      { name: "Transporte", type: "EXPENSE", icon: "car" },
      testPrisma
    )
    const cats = await getCategories(userAId, testPrisma)
    expect(cats.length).toBe(2)
  })

  it("atualiza categoria pelo id", async () => {
    const cats = await getCategories(userAId, testPrisma)
    const first = cats[0]
    const updated = await updateCategory(
      first.id,
      userAId,
      { name: "Alimentação Atualizada" },
      testPrisma
    )
    expect(updated?.name).toBe("Alimentação Atualizada")
  })

  it("retorna null ao tentar atualizar categoria de outro user", async () => {
    const cats = await getCategories(userAId, testPrisma)
    const result = await updateCategory(
      cats[0].id,
      userBId,
      { name: "Hack" },
      testPrisma
    )
    expect(result).toBeNull()
  })

  it("bloqueia delete se categoria tem transações", async () => {
    const cats = await getCategories(userAId, testPrisma)
    const catId = cats[1].id
    await testPrisma.transaction.create({
      data: {
        amount: 50,
        type: "EXPENSE",
        categoryId: catId,
        userId: userAId,
        date: new Date(),
      },
    })
    const result = await deleteCategory(catId, userAId, testPrisma)
    expect(result?.blocked).toBe(true)

    await testPrisma.transaction.deleteMany({ where: { categoryId: catId } })
  })

  it("deleta categoria sem transações", async () => {
    const cat = await createCategory(
      userAId,
      { name: "Temporária", type: "INCOME" },
      testPrisma
    )
    const result = await deleteCategory(cat.id, userAId, testPrisma)
    expect(result?.blocked).toBe(false)

    const exists = await testPrisma.category.findUnique({
      where: { id: cat.id },
    })
    expect(exists).toBeNull()
  })

  it("tenant isolation — User B não vê categorias do User A", async () => {
    const catsB = await getCategories(userBId, testPrisma)
    expect(catsB).toEqual([])
  })
})
