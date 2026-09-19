// @vitest-environment node
import { describe, expect, it } from "vitest"
import { businessDaysInMonth, computeBenefitTotals, estimateBenefitCredit } from "../benefit"

describe("benefit helpers", () => {
  it("conta dias úteis (seg-sex) de meses conhecidos", () => {
    expect(businessDaysInMonth("2026-09")).toBe(22)
    expect(businessDaysInMonth("2026-02")).toBe(20)
    expect(businessDaysInMonth("2026-11")).toBe(21)
    expect(businessDaysInMonth("2028-02")).toBe(21)
  })

  it("estima o crédito como rate x dias úteis", () => {
    expect(estimateBenefitCredit(22, "2026-09")).toBe(484)
    expect(estimateBenefitCredit(10.25, "2026-11")).toBe(215.25)
  })

  it("zera estimativa sem rate válido", () => {
    expect(estimateBenefitCredit(0, "2026-09")).toBe(0)
    const totals = computeBenefitTotals([
      { benefitDailyRate: null, movements: [] },
      { benefitDailyRate: 0, movements: [] },
    ], "2026-09")
    expect(totals).toEqual({ credited: 0, spent: 0, estimated: false })
  })

  it("não estima quando há crédito lançado e separa crédito/gasto", () => {
    const totals = computeBenefitTotals([
      {
        benefitDailyRate: 22,
        movements: [
          { amount: 500, type: "INCOME" },
          { amount: 120.5, type: "EXPENSE" },
          { amount: 80.3, type: "EXPENSE" },
        ],
      },
    ], "2026-10")

    expect(totals).toEqual({ credited: 500, spent: 200.8, estimated: false })
  })

  it("estima por conta sem crédito e soma multi-contas arredondando centavos", () => {
    const totals = computeBenefitTotals([
      { benefitDailyRate: 10.25, movements: [] },
      {
        benefitDailyRate: 5.1,
        movements: [
          { amount: 100.1, type: "INCOME" },
          { amount: 30.05, type: "EXPENSE" },
        ],
      },
    ], "2026-11")

    expect(totals.credited).toBe(315.35)
    expect(totals.spent).toBe(30.05)
    expect(totals.estimated).toBe(true)
  })

  it("ignora ajustes no crédito/gasto do benefício", () => {
    const totals = computeBenefitTotals([
      {
        benefitDailyRate: 22,
        movements: [
          { amount: 500, type: "INCOME", description: "RECARGA BENEFÍCIO: SETEMBRO" },
          { amount: 120.5, type: "EXPENSE", description: "Mercado" },
          { amount: 80.3, type: "EXPENSE", description: "Padaria" },
          { amount: 117.49, type: "EXPENSE", description: "AJUSTE IMPORTACAO EXTRATO" },
          { amount: 50, type: "INCOME", description: "AJUSTE_MANUAL:CORRECAO" },
          { amount: 30, type: "EXPENSE", description: "ajuste manual de saldo" },
        ],
      },
    ], "2026-09")

    expect(totals).toEqual({ credited: 500, spent: 200.8, estimated: false })
  })

  it("estima quando o mês só tem ajustes lançados", () => {
    const totals = computeBenefitTotals([
      {
        benefitDailyRate: 22,
        movements: [
          { amount: 117.49, type: "EXPENSE", description: "AJUSTE IMPORTACAO EXTRATO" },
          { amount: 50, type: "INCOME", description: "Ajuste manual" },
        ],
      },
    ], "2026-09")

    expect(totals).toEqual({ credited: 484, spent: 0, estimated: true })
  })
})
