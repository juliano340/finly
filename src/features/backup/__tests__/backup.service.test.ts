// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { exportData, importData } from "@/features/backup/backup.service"
import type { BackupData } from "@/features/backup/backup.schema"

const testPrisma = getTestClient()

const CAT_ID = "bkp_cat"
const FM_ID = "bkp_fm"
const BA_ID = "bkp_ba"
const CARD_ID = "bkp_card"
const TX_ID = "bkp_tx"
const BGT_ID = "bkp_bgt"
const BAM_ID = "bkp_bam"
const FC_ID = "bkp_fc"
const CI_ID = "bkp_ci"
const FCO_ID = "bkp_fco"

function fullBackup(): BackupData {
  return {
    version: 1,
    exportedAt: new Date("2026-06-20T12:00:00.000Z"),
    data: {
      categories: [{ id: CAT_ID, name: "Alimentação", icon: "shopping-cart", color: "#FF0000", type: "EXPENSE" }],
      financialMonths: [{ id: FM_ID, month: "2026-06", status: "OPEN" }],
      bankAccounts: [{ id: BA_ID, name: "Conta Principal", institution: "Nubank", type: "CHECKING", color: "#22C55E", initialBalance: 1000, active: true }],
      cards: [{ id: CARD_ID, name: "Cartão Teste", brand: null, color: "#0000FF", closingDay: null, dueDay: null, bankAccountId: BA_ID }],
      transactions: [{ id: TX_ID, amount: 150, type: "EXPENSE", description: "Mercado", date: new Date("2026-06-01T12:00:00.000Z"), categoryId: CAT_ID }],
      budgets: [{ id: BGT_ID, amount: 1000, month: "2026-06", categoryId: CAT_ID }],
      bankAccountMovements: [{ id: BAM_ID, bankAccountId: BA_ID, amount: 500, type: "INCOME", description: "Depósito", date: new Date("2026-06-01T12:00:00.000Z") }],
      fixedCosts: [{ id: FC_ID, name: "Internet", type: "EXPENSE", defaultAmount: 200, categoryId: CAT_ID, paymentMethod: "PIX", dueDay: null, paidInsideCard: false, cardId: null, bankAccountId: BA_ID, active: true }],
      cardInvoices: [{ id: CI_ID, cardId: CARD_ID, financialMonthId: FM_ID, month: "2026-06", dueDate: new Date("2026-06-15T12:00:00.000Z"), amount: 300, status: "PENDING", paidAt: null, paymentMethod: null, paymentBankAccountId: null, bankAccountMovementId: null }],
      fixedCostOccurrences: [{ id: FCO_ID, fixedCostId: FC_ID, financialMonthId: FM_ID, month: "2026-06", amount: 200, status: "PENDING", paidAt: null }],
    },
  }
}

async function deleteAllUserData(userId: string) {
  await testPrisma.fixedCostOccurrence.deleteMany({ where: { userId } })
  await testPrisma.cardInvoice.deleteMany({ where: { userId } })
  await testPrisma.fixedCost.deleteMany({ where: { userId } })
  await testPrisma.bankAccountMovement.deleteMany({ where: { userId } })
  await testPrisma.budget.deleteMany({ where: { userId } })
  await testPrisma.transaction.deleteMany({ where: { userId } })
  await testPrisma.card.deleteMany({ where: { userId } })
  await testPrisma.bankAccount.deleteMany({ where: { userId } })
  await testPrisma.financialMonth.deleteMany({ where: { userId } })
  await testPrisma.category.deleteMany({ where: { userId } })
}

describe("Backup Service", () => {
  let userId: string
  const suffix = Date.now()

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Backup User", email: `bkp-${suffix}@test.com`, password: "Senha123" },
      testPrisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
  })

  afterAll(async () => {
    await deleteAllUserData(userId)
    await testPrisma.user.delete({ where: { id: userId } })
  })

  describe("exportData", () => {
    it("retorna arrays vazios para usuário sem dados", async () => {
      const backup = await exportData(userId, testPrisma)
      expect(backup.version).toBe(1)
      expect(backup.exportedAt).toBeInstanceOf(Date)
      expect(backup.data.categories).toEqual([])
      expect(backup.data.financialMonths).toEqual([])
      expect(backup.data.bankAccounts).toEqual([])
      expect(backup.data.cards).toEqual([])
      expect(backup.data.transactions).toEqual([])
      expect(backup.data.budgets).toEqual([])
      expect(backup.data.bankAccountMovements).toEqual([])
      expect(backup.data.fixedCosts).toEqual([])
      expect(backup.data.cardInvoices).toEqual([])
      expect(backup.data.fixedCostOccurrences).toEqual([])
    })

    it("exporta todas as 10 entidades do usuário", async () => {
      const cat = await testPrisma.category.create({ data: { name: `Cat ${suffix}`, type: "EXPENSE", userId } })
      const fm = await testPrisma.financialMonth.create({ data: { month: `${suffix}-01`, userId } })
      const ba = await testPrisma.bankAccount.create({ data: { name: `BA ${suffix}`, type: "DIGITAL", userId } })
      const card = await testPrisma.card.create({ data: { name: `Card ${suffix}`, userId, bankAccountId: ba.id } })
      await testPrisma.transaction.create({ data: { amount: 100, type: "EXPENSE", categoryId: cat.id, userId, date: new Date() } })
      await testPrisma.budget.create({ data: { amount: 500, month: `${suffix}-01`, categoryId: cat.id, userId } })
      await testPrisma.bankAccountMovement.create({ data: { bankAccountId: ba.id, amount: 200, type: "INCOME", userId, date: new Date() } })
      await testPrisma.fixedCost.create({ data: { name: `FC ${suffix}`, defaultAmount: 100, categoryId: cat.id, paymentMethod: "PIX", userId } })
      await testPrisma.cardInvoice.create({ data: { cardId: card.id, financialMonthId: fm.id, month: `${suffix}-01`, dueDate: new Date(), amount: 300, userId } })
      await testPrisma.fixedCostOccurrence.create({ data: { fixedCostId: (await testPrisma.fixedCost.findFirst({ where: { userId } }))!.id, financialMonthId: fm.id, month: `${suffix}-01`, amount: 100, userId } })

      const backup = await exportData(userId, testPrisma)
      expect(backup.data.categories.length).toBe(1)
      expect(backup.data.categories[0].name).toBe(`Cat ${suffix}`)
      expect(backup.data.financialMonths.length).toBe(1)
      expect(backup.data.bankAccounts.length).toBe(1)
      expect(backup.data.cards.length).toBe(1)
      expect(backup.data.transactions.length).toBe(1)
      expect(backup.data.budgets.length).toBe(1)
      expect(backup.data.bankAccountMovements.length).toBe(1)
      expect(backup.data.fixedCosts.length).toBe(1)
      expect(backup.data.cardInvoices.length).toBe(1)
      expect(backup.data.fixedCostOccurrences.length).toBe(1)

      await deleteAllUserData(userId)
    })

    it("does not restore a soft-deleted occurrence from a replace backup", async () => {
      const cat = await testPrisma.category.create({ data: { name: `Deleted occurrence ${suffix}`, type: "EXPENSE", userId } })
      const fm = await testPrisma.financialMonth.create({ data: { month: `${suffix}-02`, userId } })
      const fixedCost = await testPrisma.fixedCost.create({
        data: { name: `Deleted FC ${suffix}`, defaultAmount: 100, categoryId: cat.id, paymentMethod: "PIX", userId },
      })
      const active = await testPrisma.fixedCostOccurrence.create({
        data: { fixedCostId: fixedCost.id, financialMonthId: fm.id, month: `${suffix}-02`, amount: 100, userId },
      })
      await testPrisma.fixedCostOccurrence.create({
        data: { fixedCostId: fixedCost.id, financialMonthId: fm.id, month: `${suffix}-02`, amount: 100, deletedAt: new Date(), userId },
      })

      const backup = await exportData(userId, testPrisma)
      expect(backup.data.fixedCostOccurrences.map((occurrence) => occurrence.id)).toEqual([active.id])

      const result = await importData(userId, backup, "replace", testPrisma)
      expect(result.imported.fixedCostOccurrences).toBe(1)

      const restored = await testPrisma.fixedCostOccurrence.findMany({ where: { userId } })
      expect(restored).toHaveLength(1)
      expect(restored[0].deletedAt).toBeNull()

      await deleteAllUserData(userId)
    })
  })

  describe("importData replace", () => {
    beforeAll(async () => {
      await deleteAllUserData(userId)
      await testPrisma.category.create({ data: { name: "Old Cat", type: "EXPENSE", userId } })
    })

    it("substitui dados existentes pelo backup", async () => {
      const result = await importData(userId, fullBackup(), "replace", testPrisma)
      expect(result.imported.categories).toBe(1)
      expect(result.imported.financialMonths).toBe(1)
      expect(result.imported.bankAccounts).toBe(1)
      expect(result.imported.cards).toBe(1)
      expect(result.imported.transactions).toBe(1)
      expect(result.imported.budgets).toBe(1)
      expect(result.imported.bankAccountMovements).toBe(1)
      expect(result.imported.fixedCosts).toBe(1)
      expect(result.imported.cardInvoices).toBe(1)
      expect(result.imported.fixedCostOccurrences).toBe(1)

      const cats = await testPrisma.category.findMany({ where: { userId } })
      expect(cats.length).toBe(1)
      expect(cats[0].name).toBe("Alimentação")

      await deleteAllUserData(userId)
    })
  })

  describe("importData merge", () => {
    beforeAll(async () => {
      await deleteAllUserData(userId)
    })

    it("não duplica registros com mesma chave única", async () => {
      const backup = fullBackup()
      await importData(userId, backup, "replace", testPrisma)

      const result = await importData(userId, backup, "merge", testPrisma)
      expect(result.imported.categories).toBe(0)
      expect(result.imported.financialMonths).toBe(0)
      expect(result.imported.bankAccounts).toBe(0)
      expect(result.imported.cards).toBe(0)
      expect(result.imported.fixedCosts).toBe(0)

      const cats = await testPrisma.category.findMany({ where: { userId } })
      expect(cats.length).toBe(1)

      await deleteAllUserData(userId)
    })

    it("importa registros novos quando a chave única não existe", async () => {
      const backup = fullBackup()
      backup.data.categories = [
        { id: "cat_a", name: "Alimentação", icon: "default", color: "#000", type: "EXPENSE" },
      ]
      backup.data.financialMonths = [{ id: "fm_a", month: "2026-07", status: "OPEN" }]
      backup.data.bankAccounts = [{ id: "ba_a", name: "Conta Nova", institution: null, type: "CHECKING", color: "#FFF", initialBalance: 0, active: true }]

      const result = await importData(userId, backup, "merge", testPrisma)
      expect(result.imported.categories).toBe(1)
      expect(result.imported.financialMonths).toBe(1)
      expect(result.imported.bankAccounts).toBe(1)

      await deleteAllUserData(userId)
    })
  })

  describe("orphan handling", () => {
    beforeAll(async () => {
      await deleteAllUserData(userId)
    })

    it("ignora transaction com categoryId não resolvido", async () => {
      const backup = fullBackup()
      backup.data.categories = []
      backup.data.financialMonths = [{ id: FM_ID, month: "2026-06", status: "OPEN" }]
      backup.data.bankAccounts = []

      const result = await importData(userId, backup, "replace", testPrisma)
      expect(result.imported.categories).toBe(0)
      expect(result.imported.transactions).toBe(0)
      expect(result.imported.budgets).toBe(0)
      expect(result.imported.bankAccountMovements).toBe(0)
      expect(result.imported.fixedCosts).toBe(0)

      await deleteAllUserData(userId)
    })
  })
})
