import { describe, expect, it } from "vitest"
import { getPasswordStrength } from "../password-strength"

describe("getPasswordStrength", () => {
  it("senha vazia ou curta tem força mínima", () => {
    expect(getPasswordStrength("")).toBe(0)
    expect(getPasswordStrength("abc")).toBe(0)
  })

  it("pontua por comprimento, maiúsculas+minúsculas, número e símbolo", () => {
    expect(getPasswordStrength("abcdefgh")).toBe(1)
    expect(getPasswordStrength("abcdefgH")).toBe(2)
    expect(getPasswordStrength("abcdefgH1")).toBe(3)
    expect(getPasswordStrength("abcdefgH1!")).toBe(4)
  })

  it("senha longa com todos os critérios é forte", () => {
    expect(getPasswordStrength("Finly45678!x")).toBe(4)
  })
})
