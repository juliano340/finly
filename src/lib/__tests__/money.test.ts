import { describe, expect, it } from "vitest"
import { moneyToNumber, subtractMoney, sumMoney, toMoney } from "@/lib/money"

describe("money", () => {
  it("soma valores decimais sem erro binário", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
  })

  it("subtrai valores monetários com precisão decimal", () => {
    expect(subtractMoney(1, 0.9)).toBe(0.1)
  })

  it("arredonda para duas casas na fronteira monetária", () => {
    expect(moneyToNumber(toMoney("10.005"))).toBe(10.01)
  })
})
