import { describe, it, expect } from "vitest"
import { backupSchema } from "@/features/backup/backup.schema"

const validBackup = {
  version: 1,
  exportedAt: "2026-06-20T12:00:00.000Z",
  data: {
    categories: [{ id: "cat1", name: "Alimentação" }],
    financialMonths: [{ id: "fm1", month: "2026-06" }],
    bankAccounts: [{ id: "ba1", name: "Nubank" }],
    cards: [{ id: "card1", name: "Nubank" }],
    transactions: [{ id: "tx1", amount: 100, type: "EXPENSE", date: "2026-06-01T12:00:00.000Z", categoryId: "cat1" }],
    budgets: [{ id: "bgt1", amount: 500, month: "2026-06", categoryId: "cat1" }],
    bankAccountMovements: [{ id: "bam1", bankAccountId: "ba1", amount: 100, type: "INCOME", date: "2026-06-01T12:00:00.000Z" }],
    fixedCosts: [{ id: "fc1", name: "Internet", defaultAmount: 120, categoryId: "cat1", paymentMethod: "PIX" }],
    cardInvoices: [{ id: "ci1", cardId: "card1", financialMonthId: "fm1", month: "2026-06", dueDate: "2026-06-15T12:00:00.000Z", amount: 500 }],
    fixedCostOccurrences: [{ id: "fco1", fixedCostId: "fc1", financialMonthId: "fm1", month: "2026-06", amount: 120 }],
  },
}

describe("backupSchema", () => {
  it("aceita backup válido completo", () => {
    const result = backupSchema.safeParse(validBackup)
    expect(result.success).toBe(true)
  })

  it("rejeita version diferente de 1", () => {
    const result = backupSchema.safeParse({ ...validBackup, version: 2 })
    expect(result.success).toBe(false)
  })

  it("rejeita exportedAt inválido", () => {
    const result = backupSchema.safeParse({ ...validBackup, exportedAt: "not-a-date" })
    expect(result.success).toBe(false)
  })

  it("aplica defaults nas entidades quando omitidos", () => {
    const minimal = {
      version: 1,
      exportedAt: "2026-06-20T12:00:00.000Z",
      data: {
        categories: [{ id: "c1", name: "Teste" }],
        financialMonths: [{ id: "fm1", month: "2026-06" }],
        bankAccounts: [{ id: "ba1", name: "Banco" }],
        cards: [{ id: "ca1", name: "Card" }],
        transactions: [{ id: "t1", amount: 100, type: "EXPENSE", date: "2026-06-01T12:00:00.000Z", categoryId: "c1" }],
        budgets: [{ id: "b1", amount: 500, month: "2026-06", categoryId: "c1" }],
        bankAccountMovements: [{ id: "m1", bankAccountId: "ba1", amount: 100, type: "INCOME", date: "2026-06-01T12:00:00.000Z" }],
        fixedCosts: [{ id: "f1", name: "Gasto", defaultAmount: 100, categoryId: "c1", paymentMethod: "PIX" }],
        cardInvoices: [{ id: "i1", cardId: "ca1", financialMonthId: "fm1", month: "2026-06", dueDate: "2026-06-15T12:00:00.000Z", amount: 300 }],
        fixedCostOccurrences: [{ id: "o1", fixedCostId: "f1", financialMonthId: "fm1", month: "2026-06", amount: 100 }],
      },
    }
    const result = backupSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data.categories[0].icon).toBe("wallet")
      expect(result.data.data.categories[0].color).toBe("#0EA882")
      expect(result.data.data.bankAccounts[0].type).toBe("CHECKING")
    }
  })

  it("data.* arrays aceitam vazio", () => {
    const result = backupSchema.safeParse({
      version: 1,
      exportedAt: "2026-06-20T12:00:00.000Z",
      data: {
        categories: [],
        financialMonths: [],
        bankAccounts: [],
        cards: [],
        transactions: [],
        budgets: [],
        bankAccountMovements: [],
        fixedCosts: [],
        cardInvoices: [],
        fixedCostOccurrences: [],
      },
    })
    expect(result.success).toBe(true)
  })
})
