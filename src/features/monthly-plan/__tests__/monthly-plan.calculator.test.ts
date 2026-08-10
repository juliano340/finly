import { describe, it, expect } from "vitest"
import { Prisma } from "@/generated/prisma/client"
import { calculateMonthlyPlan, getDaysRemaining } from "../monthly-plan.calculator"

const dec = (value: string | number) => new Prisma.Decimal(value)
const sp = (iso: string) => new Date(iso)

function inputs(overrides: Partial<Parameters<typeof calculateMonthlyPlan>[0]> = {}) {
  return {
    month: "2026-08",
    asOf: sp("2026-08-12T15:00:00Z"), // 12:00 em São Paulo
    plannedIncome: dec(1500),
    committedExpenses: dec(835),
    savingsGoal: dec(300),
    safetyMargin: dec(0),
    variableSpent: dec(0),
    ...overrides,
  }
}

describe("getDaysRemaining", () => {
  it("mês atual conta o dia de hoje inclusivamente", () => {
    expect(getDaysRemaining("2026-08", sp("2026-08-12T15:00:00Z"))).toBe(20)
  })

  it("primeiro dia do mês conta todos os dias", () => {
    expect(getDaysRemaining("2026-08", sp("2026-08-01T15:00:00Z"))).toBe(31)
  })

  it("último dia do mês conta apenas hoje", () => {
    expect(getDaysRemaining("2026-08", sp("2026-08-31T15:00:00Z"))).toBe(1)
  })

  it("mês futuro usa todos os dias civis", () => {
    expect(getDaysRemaining("2026-09", sp("2026-08-12T15:00:00Z"))).toBe(30)
  })

  it("fevereiro bissexto tem 29 dias", () => {
    expect(getDaysRemaining("2024-02", sp("2024-01-15T15:00:00Z"))).toBe(29)
  })

  it("fevereiro comum tem 28 dias", () => {
    expect(getDaysRemaining("2026-02", sp("2026-01-15T15:00:00Z"))).toBe(28)
  })

  it("mês passado retorna zero", () => {
    expect(getDaysRemaining("2026-07", sp("2026-08-12T15:00:00Z"))).toBe(0)
  })

  it("meia-noite de São Paulo define o dia financeiro", () => {
    expect(getDaysRemaining("2026-08", sp("2026-08-10T01:00:00Z"))).toBe(23)
    expect(getDaysRemaining("2026-08", sp("2026-08-10T03:30:00Z"))).toBe(22)
  })
})

describe("calculateMonthlyPlan — exemplos canônicos", () => {
  it("1500 - 835 - 300 = 365 disponíveis", () => {
    const result = calculateMonthlyPlan(inputs())
    expect(result.plannedBalance).toBe(665)
    expect(result.projectedSavings).toBe(665)
    expect(result.variableAvailable).toBe(365)
  })

  it("365 disponíveis e 20 dias → 18,25/dia", () => {
    const result = calculateMonthlyPlan(inputs())
    expect(result.daysRemaining).toBe(20)
    expect(result.dailySafeLimit).toBe(18.25)
  })

  it("sem gasto e 19 dias → ≈19,21/dia, não 36,50", () => {
    const result = calculateMonthlyPlan(inputs({ asOf: sp("2026-08-13T15:00:00Z") }))
    expect(result.daysRemaining).toBe(19)
    expect(result.dailySafeLimit).toBe(19.21)
  })

  it("após gasto de 30 e 19 dias → ≈17,63/dia", () => {
    const result = calculateMonthlyPlan(
      inputs({ asOf: sp("2026-08-13T15:00:00Z"), variableSpent: dec(30) })
    )
    expect(result.variableAvailable).toBe(335)
    expect(result.dailySafeLimit).toBe(17.63)
  })
})

describe("calculateMonthlyPlan — precisão Decimal", () => {
  it("0.1 + 0.2 não produz 0.30000000000000004", () => {
    const result = calculateMonthlyPlan(
      inputs({ plannedIncome: dec("0.3"), committedExpenses: dec(0), savingsGoal: dec(0) })
    )
    expect(result.variableAvailable).toBe(0.3)
  })

  it("divisão com dízima arredonda apenas na borda", () => {
    const result = calculateMonthlyPlan(
      inputs({
        asOf: sp("2026-08-29T15:00:00Z"),
        plannedIncome: dec(100),
        committedExpenses: dec(0),
        savingsGoal: dec(0),
        safetyMargin: dec(0),
      })
    )
    expect(result.daysRemaining).toBe(3)
    expect(result.dailySafeLimit).toBe(33.33)
  })
})

describe("calculateMonthlyPlan — limites", () => {
  it("disponível negativo preserva o valor bruto e zera o limite", () => {
    const result = calculateMonthlyPlan(
      inputs({
        plannedIncome: dec(1000),
        committedExpenses: dec(1200),
        savingsGoal: dec(100),
        variableSpent: dec(50),
      })
    )
    expect(result.variableAvailable).toBe(-350)
    expect(result.dailySafeLimit).toBe(0)
  })

  it("limite diário nunca é negativo", () => {
    const result = calculateMonthlyPlan(
      inputs({
        plannedIncome: dec(0),
        committedExpenses: dec(0),
        savingsGoal: dec(0),
        safetyMargin: dec(0),
        variableSpent: dec(0),
      })
    )
    expect(result.dailySafeLimit).toBe(0)
    expect(result.dailySafeLimit >= 0).toBe(true)
  })

  it("mês passado tem divisor zero e limite zero, mas mantém a composição", () => {
    const result = calculateMonthlyPlan(inputs({ month: "2026-07", asOf: sp("2026-08-13T15:00:00Z") }))
    expect(result.daysRemaining).toBe(0)
    expect(result.dailySafeLimit).toBe(0)
    expect(result.variableAvailable).toBe(365)
  })

  it("mês futuro usa todos os dias do mês", () => {
    const result = calculateMonthlyPlan(inputs({ month: "2026-09", asOf: sp("2026-08-13T15:00:00Z") }))
    expect(result.daysRemaining).toBe(30)
    expect(result.dailySafeLimit).toBe(12.17)
  })
})

describe("calculateMonthlyPlan — status", () => {
  it("NORMAL quando meta e margem cobertas e ritmo ok", () => {
    const result = calculateMonthlyPlan(inputs())
    expect(result.status.code).toBe("NORMAL")
    expect(result.status.label).toBe("Dentro da meta")
    expect(result.status.reason.length).toBeGreaterThan(0)
  })

  it("RISK quando o saldo projetado não cobre a meta", () => {
    const result = calculateMonthlyPlan(
      inputs({
        plannedIncome: dec(1000),
        committedExpenses: dec(800),
        savingsGoal: dec(300),
      })
    )
    expect(result.status.code).toBe("RISK")
    expect(result.status.label).toBe("Meta ameaçada")
  })

  it("ATTENTION quando a meta está coberta mas a margem não", () => {
    const result = calculateMonthlyPlan(
      inputs({
        plannedIncome: dec(1500),
        committedExpenses: dec(1150),
        savingsGoal: dec(300),
        safetyMargin: dec(100),
      })
    )
    expect(result.status.code).toBe("ATTENTION")
    expect(result.status.label).toBe("Atenção")
  })

  it("ATTENTION quando gasto variável supera o ritmo proporcional", () => {
    const result = calculateMonthlyPlan(
      inputs({
        asOf: sp("2026-08-20T15:00:00Z"),
        plannedIncome: dec(1500),
        committedExpenses: dec(835),
        savingsGoal: dec(300),
        variableSpent: dec(250),
      })
    )
    expect(result.status.code).toBe("ATTENTION")
  })

  it("status em mês futuro ignora o alerta de ritmo", () => {
    const result = calculateMonthlyPlan(
      inputs({
        month: "2026-09",
        asOf: sp("2026-08-20T15:00:00Z"),
        plannedIncome: dec(1500),
        committedExpenses: dec(835),
        savingsGoal: dec(300),
        variableSpent: dec(250),
      })
    )
    expect(result.status.code).toBe("NORMAL")
  })
})
