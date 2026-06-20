// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createBankAccount } from "@/features/bank-accounts/bank-accounts.service"
import { getCards, createCard, updateCard, deleteCard } from "@/features/cards/cards.service"

const testPrisma = getTestClient()

describe("Cards Service", () => {
  let userAId: string
  let userBId: string
  let bankAId: string
  let bankBId: string
  const suffix = Date.now()

  beforeAll(async () => {
    const rA = await registerUser(
      { name: "Card User A", email: `card-a-${suffix}@test.com`, password: "Senha123" },
      testPrisma
    )
    const rB = await registerUser(
      { name: "Card User B", email: `card-b-${suffix}@test.com`, password: "Senha123" },
      testPrisma
    )
    userAId = ("user" in rA ? rA.user : null)?.id ?? ""
    userBId = ("user" in rB ? rB.user : null)?.id ?? ""

    bankAId = (await createBankAccount(
      userAId,
      { name: `Banco A ${suffix}`, institution: "Banco A", type: "DIGITAL", color: "#FF5733", initialBalance: 0, active: true },
      testPrisma
    )).id

    bankBId = (await createBankAccount(
      userBId,
      { name: `Banco B ${suffix}`, institution: "Banco B", type: "DIGITAL", color: "#3357FF", initialBalance: 0, active: true },
      testPrisma
    )).id
  })

  afterAll(async () => {
    await testPrisma.card.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await testPrisma.bankAccount.deleteMany({ where: { id: { in: [bankAId, bankBId] } } })
    await testPrisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
  })

  describe("getCards", () => {
    it("retorna array vazio para usuário sem cartões", async () => {
      const cards = await getCards(userBId, testPrisma)
      expect(cards).toEqual([])
    })

    it("retorna cartões em ordem alfabética com bankAccount", async () => {
      await createCard(userAId, { name: "Z Card" }, testPrisma)
      await createCard(userAId, { name: "A Card" }, testPrisma)
      const cards = await getCards(userAId, testPrisma)
      expect(cards.length).toBe(2)
      expect(cards[0].name).toBe("A Card")
      expect(cards[1].name).toBe("Z Card")
    })

    it("tenant isolation — User B não vê cartões do User A", async () => {
      const cardsB = await getCards(userBId, testPrisma)
      expect(cardsB).toEqual([])
    })
  })

  describe("createCard", () => {
    it("cria cartão com campos mínimos", async () => {
      const card = await createCard(userAId, { name: "Mínimo" }, testPrisma)
      expect(card).not.toBeNull()
      expect(card!.name).toBe("Mínimo")
      expect(card!.color).toBe("#22C55E")
      expect(card!.userId).toBe(userAId)
      await testPrisma.card.delete({ where: { id: card!.id } })
    })

    it("cria cartão com todos os campos", async () => {
      const card = await createCard(
        userAId,
        { name: "Completo", brand: "Visa", color: "#000", closingDay: 10, dueDay: 20, bankAccountId: bankAId },
        testPrisma
      )
      expect(card).not.toBeNull()
      expect(card!.brand).toBe("Visa")
      expect(card!.color).toBe("#000")
      expect(card!.closingDay).toBe(10)
      expect(card!.dueDay).toBe(20)
      expect(card!.bankAccountId).toBe(bankAId)
      await testPrisma.card.delete({ where: { id: card!.id } })
    })

    it("rejeita bankAccountId de outro usuário", async () => {
      const card = await createCard(userAId, { name: "Inválido", bankAccountId: bankBId }, testPrisma)
      expect(card).toBeNull()
    })

    it("retorna null para bankAccountId inexistente", async () => {
      const card = await createCard(userAId, { name: "Inexistente", bankAccountId: "fake-id" }, testPrisma)
      expect(card).toBeNull()
    })

    it("herda cor do bankAccount quando color é #22C55E (default)", async () => {
      const card = await createCard(userAId, { name: "Herda Cor", color: "#22C55E", bankAccountId: bankAId }, testPrisma)
      expect(card!.color).toBe("#FF5733")
      await testPrisma.card.delete({ where: { id: card!.id } })
    })

    it("mantém cor explícita mesmo com bankAccount vinculado", async () => {
      const card = await createCard(userAId, { name: "Cor Fixa", color: "#FFF", bankAccountId: bankAId }, testPrisma)
      expect(card!.color).toBe("#FFF")
      await testPrisma.card.delete({ where: { id: card!.id } })
    })
  })

  describe("updateCard", () => {
    let cardId: string

    beforeAll(async () => {
      const card = await createCard(userAId, { name: "Update Test", bankAccountId: bankAId }, testPrisma)
      cardId = card!.id
    })

    it("atualiza nome parcialmente", async () => {
      const updated = await updateCard(cardId, userAId, { name: "Update Renomeado" }, testPrisma)
      expect(updated?.name).toBe("Update Renomeado")
    })

    it("troca bankAccount e herda cor", async () => {
      const newBank = await createBankAccount(
        userAId,
        { name: `Novo Banco ${suffix}`, institution: "Novo", type: "DIGITAL", color: "#00FF00", initialBalance: 0, active: true },
        testPrisma
      )
      const updated = await updateCard(cardId, userAId, { bankAccountId: newBank.id }, testPrisma)
      expect(updated?.color).toBe("#00FF00")
      await testPrisma.bankAccount.delete({ where: { id: newBank.id } })
    })

    it("troca bankAccount sem herdar cor quando explícita", async () => {
      const card = await createCard(userAId, { name: "Cor Explícita" }, testPrisma)
      const newBank = await createBankAccount(
        userAId,
        { name: `Outro Banco ${suffix}`, institution: "Outro", type: "DIGITAL", color: "#FF0000", initialBalance: 0, active: true },
        testPrisma
      )
      const updated = await updateCard(card.id, userAId, { bankAccountId: newBank.id, color: "#AA00AA" }, testPrisma)
      expect(updated?.color).toBe("#AA00AA")
      await testPrisma.bankAccount.delete({ where: { id: newBank.id } })
      await testPrisma.card.delete({ where: { id: card.id } })
    })

    it("retorna null para cartão de outro usuário", async () => {
      const result = await updateCard(cardId, userBId, { name: "Hack" }, testPrisma)
      expect(result).toBeNull()
    })

    it("retorna null para cartão inexistente", async () => {
      const result = await updateCard("fake-id", userAId, { name: "X" }, testPrisma)
      expect(result).toBeNull()
    })
  })

  describe("deleteCard", () => {
    it("deleta cartão com sucesso", async () => {
      const card = await createCard(userAId, { name: "Delete Me" }, testPrisma)
      const result = await deleteCard(card!.id, userAId, testPrisma)
      expect(result).toBe(true)
      const exists = await testPrisma.card.findUnique({ where: { id: card!.id } })
      expect(exists).toBeNull()
    })

    it("retorna false para cartão de outro usuário", async () => {
      const card = await createCard(userAId, { name: "Not Yours" }, testPrisma)
      const result = await deleteCard(card!.id, userBId, testPrisma)
      expect(result).toBe(false)
      await testPrisma.card.delete({ where: { id: card!.id } })
    })

    it("retorna false para cartão inexistente", async () => {
      const result = await deleteCard("fake-id", userAId, testPrisma)
      expect(result).toBe(false)
    })
  })
})
