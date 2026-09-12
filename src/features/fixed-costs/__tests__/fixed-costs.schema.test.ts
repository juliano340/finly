import { describe, expect, it } from "vitest"
import { fixedCostOccurrenceAmountUpdateSchema } from "@/features/fixed-costs/fixed-costs.schema"

const base = {
  occurrenceId: "occurrence-1",
  month: "2026-10",
  scope: "THIS_MONTH" as const,
  amount: 100,
  expectedUpdatedAt: "2026-10-01T12:00:00.000Z",
}

describe("fixedCostOccurrenceAmountUpdateSchema", () => {
  it("aceita trocar somente o cartão mantendo a forma de pagamento da série", () => {
    const parsed = fixedCostOccurrenceAmountUpdateSchema.safeParse({
      ...base,
      paymentMethod: null,
      cardId: "card_2",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejeita cartão quando a forma de pagamento efetiva não é cartão", () => {
    const parsed = fixedCostOccurrenceAmountUpdateSchema.safeParse({
      ...base,
      paymentMethod: "PIX",
      cardId: "card_2",
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.some((issue) => issue.message === "Cartão só se aplica a pagamento no cartão")).toBe(true)
  })

  it("exige cartão ao escolher pagamento no cartão", () => {
    const parsed = fixedCostOccurrenceAmountUpdateSchema.safeParse({
      ...base,
      paymentMethod: "CREDIT_CARD",
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.some((issue) => issue.message === "Cartão é obrigatório para pagamento no cartão")).toBe(true)
  })

  it("rejeita vencimento fora do mês e personalização em outros escopos", () => {
    const wrongDate = fixedCostOccurrenceAmountUpdateSchema.safeParse({
      ...base,
      dueDate: "2026-11-05",
    })
    expect(wrongDate.success).toBe(false)

    const wrongScope = fixedCostOccurrenceAmountUpdateSchema.safeParse({
      ...base,
      scope: "ENTIRE_SERIES",
      paymentMethod: "CASH",
    })
    expect(wrongScope.success).toBe(false)
  })
})
