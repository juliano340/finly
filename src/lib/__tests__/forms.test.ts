import { describe, it, expect } from "vitest"
import { z } from "zod"
import { mapZodErrors } from "@/lib/forms"

describe("mapZodErrors", () => {
  it("mapeia issues do zod para as chaves de campo", () => {
    const schema = z.object({
      amount: z.number().positive("Valor deve ser maior que zero"),
      categoryId: z.string().min(1, "Categoria é obrigatória"),
    })
    const parsed = schema.safeParse({ amount: 0, categoryId: "" })
    if (parsed.success) throw new Error("parse deveria falhar")

    expect(mapZodErrors(parsed.error, { amount: "amount", categoryId: "category" })).toEqual({
      amount: "Valor deve ser maior que zero",
      category: "Categoria é obrigatória",
    })
  })

  it("mantém a primeira mensagem por campo e ignora paths desconhecidos", () => {
    const schema = z.object({
      name: z
        .string()
        .refine(() => false, "Primeira mensagem")
        .refine(() => false, "Segunda mensagem"),
    })
    const parsed = schema.safeParse({ name: "x" })
    if (parsed.success) throw new Error("parse deveria falhar")

    expect(mapZodErrors(parsed.error, { name: "name" })).toEqual({ name: "Primeira mensagem" })
    expect(mapZodErrors(parsed.error, {})).toEqual({})
  })
})
