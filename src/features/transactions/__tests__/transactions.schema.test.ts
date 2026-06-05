import { describe, it, expect } from "vitest"
import { transactionSchema } from "@/features/transactions/transactions.schema"

describe("transactionSchema", () => {
  const validTransaction = {
    amount: 150.5,
    type: "EXPENSE" as const,
    description: "Supermercado",
    date: new Date("2026-06-04T12:00:00"),
    categoryId: "cat_123",
  }

  it("aceita transação válida", () => {
    const result = transactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it("rejeita valor negativo", () => {
    const result = transactionSchema.safeParse({
      ...validTransaction,
      amount: -50,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita valor zero", () => {
    const result = transactionSchema.safeParse({
      ...validTransaction,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita sem categoryId", () => {
    const result = transactionSchema.safeParse({
      amount: 100,
      type: "EXPENSE",
      date: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it("aceita string de valor e converte para número", () => {
    const result = transactionSchema.safeParse({
      ...validTransaction,
      amount: "99.90",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(typeof result.data.amount).toBe("number")
      expect(result.data.amount).toBe(99.9)
    }
  })

  it("rejeita descrição maior que 200 caracteres", () => {
    const result = transactionSchema.safeParse({
      ...validTransaction,
      description: "a".repeat(201),
    })
    expect(result.success).toBe(false)
  })
})
