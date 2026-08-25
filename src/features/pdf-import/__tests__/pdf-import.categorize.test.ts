import { describe, it, expect, vi } from "vitest"

vi.mock("pdf-parse", () => ({ default: vi.fn() }))

import { matchAutoCategory, suggestCategoryId } from "../pdf-import.service"

describe("matchAutoCategory", () => {
  it("categoriza supermercado como Alimentação", () => {
    expect(matchAutoCategory("SUPERMERCADO BH LTDA")).toEqual({
      categoryName: "Alimentação",
      color: "#E85D5D",
    })
  })

  it("é case-insensitive e ignora acentos via keywords normalizadas", () => {
    const result = matchAutoCategory("Restaurante Sabor & Arte")
    expect(result?.categoryName).toBe("Alimentação")
  })

  it("categoriza transporte por múltiplas palavras-chave", () => {
    expect(matchAutoCategory("UBER TRIP HELP")).toEqual({ categoryName: "Transporte", color: "#F59E0B" })
  })

  it("prefere a regra com maior pontuação de palavras-chave", () => {
    // "uber one" + "spotify" casam 2 keywords de Assinaturas vs "uber" (1) de Transporte
    const result = matchAutoCategory("UBER ONE SPOTIFY")
    expect(result?.categoryName).toBe("Assinaturas")
  })

  it("resolve empate de pontuação pela primeira regra da tabela", () => {
    // "mercado livre" casa 1 keyword em Alimentação ("mercado") e 1 em Compras;
    // com pontuação igual vence a regra mais antiga (Alimentação).
    const result = matchAutoCategory("MERCADO LIVRE ENVIO")
    expect(result?.categoryName).toBe("Alimentação")
  })

  it("retorna null para descrição sem correspondência", () => {
    expect(matchAutoCategory("XYZWQ SEM MATCH")).toBeNull()
  })
})

describe("suggestCategoryId", () => {
  const mappings = [
    { normalizedDesc: "uber trip sao paulo", categoryId: "cat-transporte" },
    { normalizedDesc: "uber eats", categoryId: "cat-alimentacao" },
    { normalizedDesc: "mercado carrefour", categoryId: "cat-mercado" },
  ]

  it("sugere categoria por palavras em comum", () => {
    expect(suggestCategoryId("Uber Trip Sao Paulo", mappings)).toBe("cat-transporte")
  })

  it("acumula pontuação entre mapeamentos da mesma categoria", () => {
    const repeated = [
      { normalizedDesc: "uber corrida centro", categoryId: "cat-a" },
      { normalizedDesc: "uber viagem aeroporto", categoryId: "cat-a" },
      { normalizedDesc: "posto shell", categoryId: "cat-b" },
    ]
    expect(suggestCategoryId("uber posto centro", repeated)).toBe("cat-a")
  })

  it("ignora palavras com menos de 3 caracteres", () => {
    const result = suggestCategoryId("de da do uber", mappings)
    expect(result).toBe("cat-transporte")
  })

  it("retorna null quando nenhuma palavra casa", () => {
    expect(suggestCategoryId("xyz qwe asd", mappings)).toBeNull()
    expect(suggestCategoryId("", mappings)).toBeNull()
  })
})
