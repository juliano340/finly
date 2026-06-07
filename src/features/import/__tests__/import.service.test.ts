import { describe, it, expect } from "vitest"
import { parseCSV } from "../import.service"

describe("Import Service", () => {
  it("parseia CSV válido", () => {
    const csv = `data,valor,descrição
01/06/2026,-150.00,Supermercado
05/06/2026,5000.00,Salário`

    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.transactions[0].type).toBe("EXPENSE")
    expect(result.transactions[1].type).toBe("INCOME")
  })

  it("retorna erro para CSV vazio", () => {
    const result = parseCSV("")
    expect(result.transactions).toHaveLength(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("retorna erro para cabeçalho inválido", () => {
    const csv = `nome,preco
01/06/2026,150.00`
    const result = parseCSV(csv)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it(" ignora linhas vazias", () => {
    const csv = `data,valor
01/06/2026,-100.00

05/06/2026,-200.00

`
    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(2)
  })

  it("trata erros de data individual", () => {
    const csv = `data,valor
data-invalida,100.00
01/06/2026,-50.00`
    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("trata erros de valor individual", () => {
    const csv = `data,valor
01/06/2026,abc
01/06/2026,-50.00`
    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("parseia formato AAAA-MM-DD", () => {
    const csv = `data,valor
2026-06-01,-100.00`
    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].date.getFullYear()).toBe(2026)
  })

  it("parseia formato DD/MM/AAAA", () => {
    const csv = `data,valor
15/06/2026,-200.00`
    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].date.getDate()).toBe(15)
  })

  it("detecta tipo por sinal do valor", () => {
    const csv = `data,valor
01/06/2026,100.00
02/06/2026,-50.00`
    const result = parseCSV(csv)
    expect(result.transactions[0].type).toBe("INCOME")
    expect(result.transactions[1].type).toBe("EXPENSE")
  })

  it("normaliza valores com R$ e pontos", () => {
    const csv = `data,valor
01/06/2026,"R$ 1.500,00"`
    const result = parseCSV(csv)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].amount).toBe(1500)
  })
})
