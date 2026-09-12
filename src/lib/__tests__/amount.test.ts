import { describe, it, expect } from "vitest"
import { normalizeAmount, parseAmount, sanitizeAmount } from "@/lib/amount"

describe("amount", () => {
  it("sanitizeAmount remove caracteres inválidos", () => {
    expect(sanitizeAmount("R$ 1a2b,50")).toBe("12,50")
    expect(sanitizeAmount("abc")).toBe("")
  })

  it("normalizeAmount formata com duas casas", () => {
    expect(normalizeAmount("12,5")).toBe("12,50")
    expect(normalizeAmount("1234.5")).toBe("1234,50")
    expect(normalizeAmount("")).toBeNull()
    expect(normalizeAmount("12,3,4")).toBe("12,30")
  })

  it("parseAmount retorna número ou zero", () => {
    expect(parseAmount("12,50")).toBe(12.5)
    expect(parseAmount("150.75")).toBe(150.75)
    expect(parseAmount("")).toBe(0)
    expect(parseAmount("abc")).toBe(0)
  })
})
