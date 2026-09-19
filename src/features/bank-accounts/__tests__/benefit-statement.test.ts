// @vitest-environment node
import { describe, expect, it } from "vitest"
import { parseBenefitStatementCsv } from "../benefit-statement"

describe("parseBenefitStatementCsv", () => {
  it("importa layout real FLASH com 1 entrada e 2 saídas (vírgula decimal, R$ com NBSP, acentos)", () => {
    const content = [
      "Data,Movimentação,Valor",
      '01/09/2026,"Depósito transferido","R$ 500,00"',
      '02/09/2026,"Pagamento mercado","-R$ 18,50"',
      "03/09/2026,\"Lanche\",\"-R$" + String.fromCharCode(160) + "120,75\"",
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.errors).toEqual([])
    expect(result.movements).toHaveLength(3)

    expect(result.movements[0].description).toBe("Depósito transferido")
    expect(result.movements[0].amount).toBe(500)
    expect(result.movements[0].type).toBe("INCOME")
    expect(result.movements[0].date.getFullYear()).toBe(2026)
    expect(result.movements[0].date.getMonth()).toBe(8)
    expect(result.movements[0].date.getDate()).toBe(1)

    expect(result.movements[1].type).toBe("EXPENSE")
    expect(result.movements[1].amount).toBe(18.5)

    expect(result.movements[2].type).toBe("EXPENSE")
    expect(result.movements[2].amount).toBe(120.75)
  })

  it("aceita BOM UTF-8 no início do conteúdo", () => {
    const content =
      String.fromCharCode(0xfeff) +
      "Data,Movimentação,Valor\n05/09/2026,\"Depósito transferido\",\"R$ 20,00\""

    const result = parseBenefitStatementCsv(content)

    expect(result.errors).toEqual([])
    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].amount).toBe(20)
    expect(result.movements[0].type).toBe("INCOME")
  })

  it("registra erro com número da linha para data inválida e mantém a linha válida seguinte", () => {
    const content = [
      "Data,Movimentação,Valor",
      'invalida,"Algo","R$ 10,00"',
      '05/09/2026,"Depósito transferido","R$ 20,00"',
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].description).toBe("Depósito transferido")
    expect(result.movements[0].amount).toBe(20)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Linha 2")
  })

  it("registra erro com número da linha para valor inválido", () => {
    const content = [
      "Data,Movimentação,Valor",
      '05/09/2026,"Coisa válida","R$ 20,00"',
      '06/09/2026,"Coisa inválida","abc"',
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].description).toBe("Coisa válida")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Linha 3")
  })

  it("retorna erro quando o cabeçalho está ausente ou com colunas erradas", () => {
    const content = ["Foo,Bar,Baz", '05/09/2026,"Algo","R$ 10,00"'].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.movements).toEqual([])
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("retorna erro para arquivo vazio", () => {
    const result = parseBenefitStatementCsv("")

    expect(result.movements).toEqual([])
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("neutraliza formula injection prefixando apóstrofo na descrição iniciada com '='", () => {
    const content = [
      "Data,Movimentação,Valor",
      '05/09/2026,"=CMD(\'calc\')","R$ 10,00"',
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.errors).toEqual([])
    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].description.startsWith("'=")).toBe(true)
  })

  it("extrai finalBalance/totalIn/totalOut do layout real", () => {
    const content = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,JOAO RENATO ROSSETI PORTO ALEGRE BRA,"-R$ 18,50",Cartão,"R$ 0,89"',
      '29/08/2026,00:31,Depósito transferido,"R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.errors).toEqual([])
    expect(result.movements).toHaveLength(2)
    expect(result.finalBalance).toBe(0.89)
    expect(result.totalIn).toBe(466.2)
    expect(result.totalOut).toBe(18.5)
  })

  it("finalBalance null quando não há coluna Saldo", () => {
    const content = [
      "Data,Movimentação,Valor",
      '05/09/2026,"Depósito transferido","R$ 20,00"',
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.errors).toEqual([])
    expect(result.movements).toHaveLength(1)
    expect(result.finalBalance).toBeNull()
  })

  it("usa a última linha VÁLIDA quando a linha final é inválida", () => {
    const content = [
      "Data,Movimentação,Valor,Saldo",
      '01/09/2026,"Coisa válida","R$ 10,00","R$ 30,00"',
      'invalida,"Coisa inválida","R$ 5,00","R$ 99,00"',
    ].join("\n")

    const result = parseBenefitStatementCsv(content)

    expect(result.movements).toHaveLength(1)
    expect(result.finalBalance).toBe(30)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Linha 3")
  })
})
