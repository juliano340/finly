import { describe, expect, it } from "vitest"
import { computeDaysUntilDue, deriveStatus } from "../compute-days-until-due"

describe("computeDaysUntilDue", () => {
  it("retorna 0 quando vencimento é hoje", () => {
    const now = new Date("2026-07-08T10:00:00")
    const due = "2026-07-08T00:00:00.000Z"
    expect(computeDaysUntilDue(due, now)).toBe(0)
  })

  it("retorna 1 quando vencimento é amanhã", () => {
    const now = new Date("2026-07-08T10:00:00")
    const due = "2026-07-09T00:00:00.000Z"
    expect(computeDaysUntilDue(due, now)).toBe(1)
  })

  it("retorna 2 quando vencimento é em 2 dias (não deveria dizer amanhã)", () => {
    const now = new Date("2026-07-08T10:00:00")
    const due = "2026-07-10T00:00:00.000Z"
    expect(computeDaysUntilDue(due, now)).toBe(2)
  })

  it("retorna negativo quando vencimento já passou", () => {
    const now = new Date("2026-07-10T10:00:00")
    const due = "2026-07-08T00:00:00.000Z"
    expect(computeDaysUntilDue(due, now)).toBe(-2)
  })

  it("respeita meia-noite local (22h local = mesma data, não próximo dia)", () => {
    const now = new Date("2026-07-08T22:00:00")
    const due = "2026-07-10T00:00:00.000Z"
    expect(computeDaysUntilDue(due, now)).toBe(2)
  })
})

describe("deriveStatus", () => {
  it("retorna OVERDUE quando dias negativos", () => {
    expect(deriveStatus(-1)).toBe("OVERDUE")
    expect(deriveStatus(-5)).toBe("OVERDUE")
  })

  it("retorna DUE_TODAY quando dias = 0", () => {
    expect(deriveStatus(0)).toBe("DUE_TODAY")
  })

  it("retorna DUE_SOON quando dias > 0", () => {
    expect(deriveStatus(1)).toBe("DUE_SOON")
    expect(deriveStatus(7)).toBe("DUE_SOON")
  })
})