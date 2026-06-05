import { describe, it, expect } from "vitest"
import { categorySchema } from "@/features/categories/categories.schema"

describe("categorySchema", () => {
  it("aceita categoria válida", () => {
    const result = categorySchema.safeParse({
      name: "Alimentação",
      type: "EXPENSE",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita nome vazio", () => {
    const result = categorySchema.safeParse({ name: "", type: "EXPENSE" })
    expect(result.success).toBe(false)
  })

  it("rejeita sem tipo", () => {
    const result = categorySchema.safeParse({ name: "Teste" })
    expect(result.success).toBe(false)
  })

  it("rejeita tipo inválido", () => {
    const result = categorySchema.safeParse({
      name: "Teste",
      type: "INVALID",
    })
    expect(result.success).toBe(false)
  })

  it("aplica valores default (icon, color)", () => {
    const result = categorySchema.safeParse({
      name: "Saúde",
      type: "INCOME",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.icon).toBe("wallet")
      expect(result.data.color).toBe("#0EA882")
    }
  })

  it("rejeita nome maior que 50 caracteres", () => {
    const result = categorySchema.safeParse({
      name: "a".repeat(51),
      type: "EXPENSE",
    })
    expect(result.success).toBe(false)
  })
})
