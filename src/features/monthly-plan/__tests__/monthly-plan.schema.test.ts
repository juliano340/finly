import { describe, it, expect } from "vitest"
import {
  monthSchema,
  monthlyPlanUpdateSchema,
  monthlyPlanQuerySchema,
  getSupportedMonthWindow,
  isMonthWithinSupportedWindow,
} from "../monthly-plan.schema"

const VALID_UPDATE = { incomeOverride: 2000, savingsGoal: 300, safetyMargin: 100 }

describe("monthSchema", () => {
  it("aceita mês canônico", () => {
    expect(monthSchema.safeParse("2026-08").success).toBe(true)
  })

  it("rejeita mês 00", () => {
    expect(monthSchema.safeParse("2026-00").success).toBe(false)
  })

  it("rejeita mês 13", () => {
    expect(monthSchema.safeParse("2026-13").success).toBe(false)
  })

  it("rejeita formato inválido", () => {
    expect(monthSchema.safeParse("06/2026").success).toBe(false)
    expect(monthSchema.safeParse("2026-1").success).toBe(false)
  })

  it("rejeita string com dia", () => {
    expect(monthSchema.safeParse("2026-08-09").success).toBe(false)
  })
})

describe("monthlyPlanUpdateSchema", () => {
  it("aceita payload válido", () => {
    const result = monthlyPlanUpdateSchema.safeParse(VALID_UPDATE)
    expect(result.success).toBe(true)
  })

  it("aceita e preserva override nulo", () => {
    const result = monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, incomeOverride: null })
    expect(result.success).toBe(true)
    expect(result.data?.incomeOverride).toBeNull()
  })

  it("aceita e preserva zero", () => {
    const result = monthlyPlanUpdateSchema.safeParse({
      incomeOverride: 0,
      savingsGoal: 0,
      safetyMargin: 0,
    })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ incomeOverride: 0, savingsGoal: 0, safetyMargin: 0 })
  })

  it("coage strings numéricas", () => {
    const result = monthlyPlanUpdateSchema.safeParse({
      incomeOverride: "2000",
      savingsGoal: "300",
      safetyMargin: "100",
    })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ incomeOverride: 2000, savingsGoal: 300, safetyMargin: 100 })
  })

  it("rejeita meta negativa", () => {
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, savingsGoal: -1 }).success).toBe(false)
  })

  it("rejeita margem negativa", () => {
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, safetyMargin: -0.01 }).success).toBe(false)
  })

  it("rejeita override negativo", () => {
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, incomeOverride: -5 }).success).toBe(false)
  })

  it("rejeita valores acima do teto monetário", () => {
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, savingsGoal: 100000000 }).success).toBe(false)
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, safetyMargin: 999999999.99 }).success).toBe(false)
  })

  it("rejeita valores não finitos", () => {
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, savingsGoal: NaN }).success).toBe(false)
    expect(monthlyPlanUpdateSchema.safeParse({ ...VALID_UPDATE, safetyMargin: Infinity }).success).toBe(false)
  })

  it("rejeita campos fora da allowlist", () => {
    const result = monthlyPlanUpdateSchema.safeParse({
      ...VALID_UPDATE,
      userId: "user_1",
      dailySafeLimit: 18.25,
    })
    expect(result.success).toBe(false)
  })
})

describe("monthlyPlanQuerySchema", () => {
  it("aceita mês válido", () => {
    expect(monthlyPlanQuerySchema.safeParse({ month: "2026-08" }).success).toBe(true)
  })

  it("rejeita mês 00 e 13", () => {
    expect(monthlyPlanQuerySchema.safeParse({ month: "2026-00" }).success).toBe(false)
    expect(monthlyPlanQuerySchema.safeParse({ month: "2026-13" }).success).toBe(false)
  })

  it("rejeita parâmetros extras", () => {
    expect(monthlyPlanQuerySchema.safeParse({ month: "2026-08", page: 2 }).success).toBe(false)
  })
})

describe("janela suportada (D-17)", () => {
  const asOf = new Date("2026-08-09T15:00:00Z") // 12:00 em São Paulo

  it("janela vai de janeiro do ano anterior a dezembro do próximo ano", () => {
    expect(getSupportedMonthWindow(asOf)).toEqual({ min: "2025-01", max: "2027-12" })
  })

  it("extremos são inclusivos", () => {
    expect(isMonthWithinSupportedWindow("2025-01", asOf)).toBe(true)
    expect(isMonthWithinSupportedWindow("2027-12", asOf)).toBe(true)
  })

  it("mês imediatamente anterior e posterior são rejeitados", () => {
    expect(isMonthWithinSupportedWindow("2024-12", asOf)).toBe(false)
    expect(isMonthWithinSupportedWindow("2028-01", asOf)).toBe(false)
  })

  it("usa o dia civil de São Paulo, não o relógio do host/UTC", () => {
    const lateAsOf = new Date("2027-01-01T01:00:00Z") // 2026-12-31 22:00 em São Paulo
    expect(isMonthWithinSupportedWindow("2028-01", lateAsOf)).toBe(false)
    expect(isMonthWithinSupportedWindow("2027-12", lateAsOf)).toBe(true)
  })

  it("virada de ano no início", () => {
    const earlyAsOf = new Date("2024-12-31T23:00:00Z") // 2024-12-31 20:00 em São Paulo
    expect(isMonthWithinSupportedWindow("2023-01", earlyAsOf)).toBe(true)
    expect(isMonthWithinSupportedWindow("2022-12", earlyAsOf)).toBe(false)
  })

  it("usa o relógio atual quando nenhum asOf é injetado", () => {
    const { min, max } = getSupportedMonthWindow()
    expect(min < max).toBe(true)
    expect(isMonthWithinSupportedWindow(min)).toBe(true)
  })
})
