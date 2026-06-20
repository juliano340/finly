import { describe, it, expect } from "vitest"
import { cardSchema } from "@/features/cards/cards.schema"

describe("cardSchema", () => {
  it("aceita cartão válido com campos mínimos", () => {
    const result = cardSchema.safeParse({ name: "Nubank" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe("#22C55E")
    }
  })

  it("aceita cartão válido com todos os campos", () => {
    const result = cardSchema.safeParse({
      name: "Nubank",
      brand: "Mastercard",
      color: "#333333",
      closingDay: 5,
      dueDay: 15,
      bankAccountId: "abc123",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita nome vazio", () => {
    const result = cardSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejeita nome maior que 60 caracteres", () => {
    const result = cardSchema.safeParse({ name: "a".repeat(61) })
    expect(result.success).toBe(false)
  })

  it("rejeita brand maior que 40 caracteres", () => {
    const result = cardSchema.safeParse({ name: "Nubank", brand: "b".repeat(41) })
    expect(result.success).toBe(false)
  })

  it("rejeita closingDay menor que 1", () => {
    const result = cardSchema.safeParse({ name: "Nubank", closingDay: 0 })
    expect(result.success).toBe(false)
  })

  it("rejeita closingDay maior que 31", () => {
    const result = cardSchema.safeParse({ name: "Nubank", closingDay: 32 })
    expect(result.success).toBe(false)
  })

  it("rejeita dueDay menor que 1", () => {
    const result = cardSchema.safeParse({ name: "Nubank", dueDay: 0 })
    expect(result.success).toBe(false)
  })

  it("rejeita dueDay maior que 31", () => {
    const result = cardSchema.safeParse({ name: "Nubank", dueDay: 32 })
    expect(result.success).toBe(false)
  })

  it("coerce string para número em closingDay", () => {
    const result = cardSchema.safeParse({ name: "Nubank", closingDay: "15" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.closingDay).toBe(15)
    }
  })

  it("aceita campos opcionais como nulos", () => {
    const result = cardSchema.safeParse({
      name: "Nubank",
      brand: null,
      closingDay: null,
      dueDay: null,
      bankAccountId: null,
    })
    expect(result.success).toBe(true)
  })

  it("partial aceita qualquer subconjunto", () => {
    const partial = cardSchema.partial()
    const result = partial.safeParse({ name: "Só Nome" })
    expect(result.success).toBe(true)
  })
})
