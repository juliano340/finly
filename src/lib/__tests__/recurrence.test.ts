import { describe, it, expect } from "vitest"
import {
  computeRecurrenceDates,
  occurrenceDueDate,
  monthKey,
  fixCostOccurrenceDueDate,
  type RecurrenceConfig,
} from "../recurrence"

function config(overrides: Partial<RecurrenceConfig> = {}): RecurrenceConfig {
  return {
    startDate: "2026-01-31",
    frequency: "MONTHLY",
    customInterval: null,
    customUnit: null,
    endType: "NONE",
    endDate: null,
    endAfterCount: null,
    ...overrides,
  }
}

describe("computeRecurrenceDates", () => {
  it("gera datas mensais até a data máxima com clamp permanente de fim de mês", () => {
    const dates = computeRecurrenceDates(config(), new Date("2026-04-30T12:00:00"))
    expect(dates).toHaveLength(4)
    expect(dates.map((d) => d.getDate())).toEqual([31, 28, 28, 28])
    expect(dates[1].getMonth()).toBe(1)
    expect(dates[2].getMonth()).toBe(2)
  })

  it("inclui a própria data de início quando é anterior ao máximo", () => {
    const dates = computeRecurrenceDates(
      config({ startDate: "2026-03-10" }),
      new Date("2026-03-15T12:00:00")
    )
    expect(dates).toEqual([new Date(2026, 2, 10)])
  })

  it("retorna vazio quando início é posterior ao máximo", () => {
    const dates = computeRecurrenceDates(
      config({ startDate: "2026-06-10" }),
      new Date("2026-03-15T12:00:00")
    )
    expect(dates).toHaveLength(0)
  })

  it("respeita endType DATE parando após a data final", () => {
    const dates = computeRecurrenceDates(
      config({ frequency: "DAILY", endType: "DATE", endDate: "2026-02-03" }),
      new Date("2026-12-31T12:00:00")
    )
    expect(dates).toHaveLength(4)
    expect(dates[3]).toEqual(new Date(2026, 1, 3))
  })

  it("respeita endType COUNT limitando o número de ocorrências", () => {
    const dates = computeRecurrenceDates(
      config({ frequency: "WEEKLY", endType: "COUNT", endAfterCount: 3 }),
      new Date("2026-12-31T12:00:00")
    )
    expect(dates).toHaveLength(3)
  })

  it("usa Infinity quando COUNT não define endAfterCount", () => {
    const dates = computeRecurrenceDates(
      config({ frequency: "BIWEEKLY", endType: "COUNT", endAfterCount: null }),
      new Date("2026-02-28T12:00:00")
    )
    expect(dates.length).toBeGreaterThan(2)
  })

  it.each([
    ["DAILY", [31, 1, 2]],
    ["WEEKLY", [31, 7, 14]],
    ["BIWEEKLY", [31, 14, 28]],
    ["BIMONTHLY", [31, 31]],
    ["QUARTERLY", [31, 30]],
    ["SEMIANNUAL", [31, 31]],
    ["ANNUAL", [31]],
  ] as const)("aplica intervalo %s corretamente", (frequency, expectedDays) => {
    const dates = computeRecurrenceDates(
      config({ startDate: "2026-01-31", frequency }),
      new Date("2026-08-31T12:00:00")
    )
    expect(dates.slice(0, expectedDays.length).map((d) => d.getDate())).toEqual(expectedDays)
  })

  it.each([
    ["DAYS", 5, [31, 5, 10]],
    ["WEEKS", 2, [31, 14, 28]],
    ["MONTHS", 2, [31, 31]],
    ["YEARS", 1, [31]],
  ] as const)("aplica CUSTOM %s x%d", (unit, interval, expectedDays) => {
    const dates = computeRecurrenceDates(
      config({
        startDate: "2026-01-31",
        frequency: "CUSTOM",
        customInterval: interval,
        customUnit: unit,
      }),
      new Date("2026-08-31T12:00:00")
    )
    expect(dates.slice(0, expectedDays.length).map((d) => d.getDate())).toEqual(expectedDays)
  })

  it("usa fallback mensal para CUSTOM sem unidade ou intervalo ausente", () => {
    const dates = computeRecurrenceDates(
      config({ startDate: "2026-01-31", frequency: "CUSTOM", customInterval: null, customUnit: null }),
      new Date("2026-04-30T12:00:00")
    )
    expect(dates).toHaveLength(4)
  })
})

describe("occurrenceDueDate", () => {
  it("retorna a própria data quando dueDay é nulo", () => {
    const date = new Date(2026, 5, 17)
    expect(occurrenceDueDate(date, null)).toBe(date)
  })

  it("ajusta o vencimento para o dia informado no mesmo mês", () => {
    expect(occurrenceDueDate(new Date(2026, 5, 17), 10)).toEqual(new Date(2026, 5, 10))
  })

  it("faz clamp do dia 31 em mês curto", () => {
    expect(occurrenceDueDate(new Date(2026, 1, 17), 31)).toEqual(new Date(2026, 1, 28))
  })
})

describe("monthKey", () => {
  it("formata como yyyy-MM com zero à esquerda", () => {
    expect(monthKey(new Date(2026, 2, 5))).toBe("2026-03")
  })
})

describe("fixCostOccurrenceDueDate", () => {
  it("usa o dia de vencimento informado", () => {
    expect(fixCostOccurrenceDueDate(10, "2026-06")).toEqual(new Date(2026, 5, 10))
  })

  it("faz clamp no último dia de meses curtos", () => {
    expect(fixCostOccurrenceDueDate(31, "2026-02")).toEqual(new Date(2026, 1, 28))
  })

  it("usa dia 1 quando dueDay é nulo ou zero", () => {
    expect(fixCostOccurrenceDueDate(null, "2026-06")).toEqual(new Date(2026, 5, 1))
    expect(fixCostOccurrenceDueDate(0, "2026-06")).toEqual(new Date(2026, 5, 1))
  })
})
