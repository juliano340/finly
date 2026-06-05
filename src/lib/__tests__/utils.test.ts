import { describe, it, expect } from "vitest"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

describe("cn", () => {
  it("merge classes Tailwind corretamente", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2")
  })

  it("remove conflitos Tailwind (classe da direita vence)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("ignora falsy values", () => {
    expect(cn("base", false && "hidden", undefined, "extra")).toBe(
      "base extra"
    )
  })
})

describe("formatCurrency", () => {
  it("formata valor em reais", () => {
    expect(formatCurrency(1499.9)).toBe("R$\xa01.499,90")
  })

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe("R$\xa00,00")
  })

  it("formata valor negativo", () => {
    expect(formatCurrency(-50)).toBe("-R$\xa050,00")
  })
})

describe("formatDate", () => {
  it("formata data ISO para pt-BR", () => {
    const result = formatDate("2026-06-04T12:00:00")
    expect(result).toBe("04/06/2026")
  })

  it("formata objeto Date", () => {
    const result = formatDate(new Date(2026, 5, 4, 12, 0, 0))
    expect(result).toBe("04/06/2026")
  })
})
