import { describe, it, expect } from "vitest"
import { budgetSchema } from "@/features/budgets/budgets.schema"

describe("budgetSchema", () => {
  const validBudget = {
    amount: 1000,
    month: "2026-06",
    categoryId: "cat_123",
  }

  it("aceita orçamento válido", () => {
    const result = budgetSchema.safeParse(validBudget)
    expect(result.success).toBe(true)
  })

  it("rejeita valor negativo", () => {
    const result = budgetSchema.safeParse({ ...validBudget, amount: -100 })
    expect(result.success).toBe(false)
  })

  it("rejeita valor zero", () => {
    const result = budgetSchema.safeParse({ ...validBudget, amount: 0 })
    expect(result.success).toBe(false)
  })

  it("rejeita mês com formato inválido", () => {
    const result = budgetSchema.safeParse({
      ...validBudget,
      month: "06/2026",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita mês inexistente (AAAA-13)", () => {
    const result = budgetSchema.safeParse({
      ...validBudget,
      month: "2026-13",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita sem categoryId", () => {
    const result = budgetSchema.safeParse({
      amount: 500,
      month: "2026-07",
    })
    expect(result.success).toBe(false)
  })
})
