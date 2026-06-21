import { describe, it, expect } from "vitest"
import { isAccountNegative, getAvailableBalance, canWithdraw } from "../balance"

describe("isAccountNegative", () => {
  it("retorna false quando balance = 0 e overdraftLimit = 0", () => {
    expect(isAccountNegative(0, 0)).toBe(false)
  })

  it("retorna false quando balance é positivo", () => {
    expect(isAccountNegative(100, 0)).toBe(false)
  })

  it("retorna false quando balance está negativo mas dentro do limite", () => {
    expect(isAccountNegative(-100, 200)).toBe(false)
  })

  it("retorna true quando balance está no limite exato", () => {
    expect(isAccountNegative(-200, 200)).toBe(false)
  })

  it("retorna true quando balance excede overdraftLimit", () => {
    expect(isAccountNegative(-201, 200)).toBe(true)
  })

  it("retorna true quando balance é negativo e overdraftLimit = 0", () => {
    expect(isAccountNegative(-50, 0)).toBe(true)
  })
})

describe("getAvailableBalance", () => {
  it("retorna balance + overdraftLimit quando saldo positivo", () => {
    expect(getAvailableBalance(500, 200)).toBe(700)
  })

  it("retorna balance + overdraftLimit quando saldo negativo", () => {
    expect(getAvailableBalance(-100, 300)).toBe(200)
  })

  it("retorna valor negativo quando saldo excede limite", () => {
    expect(getAvailableBalance(-400, 200)).toBe(-200)
  })
})

describe("canWithdraw", () => {
  it("retorna true quando saque fica dentro do saldo", () => {
    expect(canWithdraw(500, 0, 300)).toBe(true)
  })

  it("retorna true quando saque usa parte do cheque especial", () => {
    expect(canWithdraw(100, 200, 250)).toBe(true)
  })

  it("retorna true quando saque usa limite exato", () => {
    expect(canWithdraw(100, 200, 300)).toBe(true)
  })

  it("retorna false quando saque excede cheque especial", () => {
    expect(canWithdraw(100, 200, 301)).toBe(false)
  })

  it("retorna false quando saldo é zero e não há limite", () => {
    expect(canWithdraw(0, 0, 1)).toBe(false)
  })
})
