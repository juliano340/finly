import { describe, expect, it } from "vitest"
import { dueDateIsoForMonth } from "@/lib/dates"

describe("dueDateIsoForMonth", () => {
  it("monta a data com o dia informado no mês", () => {
    expect(dueDateIsoForMonth(10, "2026-10")).toBe("2026-10-10")
    expect(dueDateIsoForMonth(1, "2026-03")).toBe("2026-03-01")
  })

  it("ajusta para o último dia em meses curtos", () => {
    expect(dueDateIsoForMonth(31, "2026-02")).toBe("2026-02-28")
    expect(dueDateIsoForMonth(31, "2026-04")).toBe("2026-04-30")
    expect(dueDateIsoForMonth(30, "2026-02")).toBe("2026-02-28")
  })

  it("retorna null quando o cartão não tem dia de vencimento", () => {
    expect(dueDateIsoForMonth(null, "2026-10")).toBeNull()
    expect(dueDateIsoForMonth(0, "2026-10")).toBeNull()
  })
})
