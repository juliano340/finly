import { describe, expect, it } from "vitest"
import { calculateInvoiceTotals } from "../invoice-calculation"

const fixedOccurrences = [
  { id: "netflix", amount: 40 },
  { id: "academy", amount: 100 },
]

describe("calculateInvoiceTotals", () => {
  it("trata valor informado como total completo sem compensação", () => {
    const result = calculateInvoiceTotals({
      calculationMode: "ENTERED_TOTAL",
      amount: 500,
      enteredTotal: 500,
      fixedOccurrences,
    })

    expect(result.effectiveTotal).toBe(500)
    expect(result.projectedFixedTotal).toBe(140)
  })

  it("soma lançamentos e fixos previstos no modo calculado", () => {
    const result = calculateInvoiceTotals({
      calculationMode: "CALCULATED",
      amount: 0,
      items: [{ amount: 500, postingStatus: "POSTED" }],
      fixedOccurrences,
    })

    expect(result.effectiveTotal).toBe(640)
    expect(result.calculatedTotal).toBe(640)
  })

  it("substitui previsão fixa quando lançamento está explicitamente vinculado", () => {
    const result = calculateInvoiceTotals({
      calculationMode: "CALCULATED",
      amount: 0,
      items: [
        { amount: 500, postingStatus: "POSTED" },
        { amount: 40, postingStatus: "POSTED", fixedCostOccurrenceId: "netflix" },
      ],
      fixedOccurrences,
    })

    expect(result.effectiveTotal).toBe(640)
    expect(result.projectedFixedTotal).toBe(100)
  })

  it("preserva valor informado ao alternar para modo calculado", () => {
    const result = calculateInvoiceTotals({
      calculationMode: "CALCULATED",
      amount: 500,
      enteredTotal: 500,
      items: [{ amount: 300, postingStatus: "PROJECTED" }],
    })

    expect(result.enteredTotal).toBe(500)
    expect(result.effectiveTotal).toBe(300)
    expect(result.difference).toBe(200)
  })
})
