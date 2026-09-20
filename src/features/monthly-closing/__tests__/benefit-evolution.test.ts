// @vitest-environment node
import { describe, expect, it } from "vitest"
import { buildBenefitEvolution, resolveBenefitRechargeAlert } from "../benefit-evolution"

describe("buildBenefitEvolution", () => {
  it("monta pontos diários com gasto do dia e saldo corrente, ignorando AJUSTE no gasto e incluindo no saldo", () => {
    const evolution = buildBenefitEvolution([
      {
        initialBalance: 100,
        movements: [
          { date: new Date("2026-09-01T12:00:00Z"), amount: 500, type: "INCOME", description: "RECARGA" },
          { date: new Date("2026-09-02T12:00:00Z"), amount: 30, type: "EXPENSE", description: "Mercado" },
          { date: new Date("2026-09-02T18:00:00Z"), amount: 20, type: "EXPENSE", description: "Padaria" },
          { date: new Date("2026-09-03T12:00:00Z"), amount: 45, type: "EXPENSE", description: "AJUSTE IMPORTACAO EXTRATO" },
          { date: new Date("2026-09-04T12:00:00Z"), amount: 10, type: "INCOME", description: "AJUSTE_MANUAL:CORRECAO" },
        ],
      },
    ], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-04T00:00:00Z"), creditStart: "2026-09-01" })

    expect(evolution.points.map((point) => point.date)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"])
    expect(evolution.points.map((point) => point.daily)).toEqual([0, 50, 0, 0])
    expect(evolution.points.map((point) => point.balance)).toEqual([600, 550, 505, 515])
    expect(evolution.credited).toBe(500)
    expect(evolution.spent).toBe(50)
    expect(evolution.currentBalance).toBe(515)
    expect(evolution.averageDaily).toBe(12.5)
    expect(evolution.movementEnd).toBe("2026-09-04")
    expect(evolution.creditStart).toBe("2026-09-01")
    expect(evolution.lastCreditDate).toBe("2026-09-01")
    expect(evolution.creditDates).toEqual(["2026-09-01"])
  })

  it("carrega o saldo de movimentos anteriores à janela", () => {
    const evolution = buildBenefitEvolution([
      {
        initialBalance: 0,
        movements: [
          { date: new Date("2026-08-29T12:00:00Z"), amount: 466.2, type: "INCOME", description: "Depósito transferido" },
          { date: new Date("2026-09-01T12:00:00Z"), amount: 18.5, type: "EXPENSE", description: "Compra" },
        ],
      },
    ], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-02T00:00:00Z") })

    expect(evolution.points[0].balance).toBe(447.7)
    expect(evolution.points[1].balance).toBe(447.7)
    expect(evolution.credited).toBe(0)
    expect(evolution.spent).toBe(18.5)
    expect(evolution.currentBalance).toBe(447.7)
    expect(evolution.averageDaily).toBe(18.5)
    expect(evolution.movementEnd).toBe("2026-09-01")
  })

  it("currentBalance soma todos os movimentos, inclusive fora da janela", () => {
    const evolution = buildBenefitEvolution([
      {
        initialBalance: 0,
        movements: [
          { date: new Date("2026-09-01T12:00:00Z"), amount: 100, type: "INCOME", description: "RECARGA" },
          { date: new Date("2026-09-02T12:00:00Z"), amount: 30, type: "EXPENSE", description: "Compra" },
          { date: new Date("2026-09-10T12:00:00Z"), amount: 20, type: "EXPENSE", description: "Fora da janela" },
          { date: new Date("2026-09-12T12:00:00Z"), amount: 40, type: "INCOME", description: "RECARGA FORA" },
        ],
      },
    ], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-05T00:00:00Z") })

    expect(evolution.points.at(-1)?.balance).toBe(70)
    expect(evolution.currentBalance).toBe(90)
    expect(evolution.spent).toBe(30)
    expect(evolution.averageDaily).toBe(15)
    expect(evolution.movementEnd).toBe("2026-09-02")
    expect(evolution.lastCreditDate).toBe("2026-09-12")
    expect(evolution.creditDates).toEqual(["2026-09-01", "2026-09-12"])
  })

  it("média diária é zero quando não há gasto", () => {
    const evolution = buildBenefitEvolution([
      {
        initialBalance: 50,
        movements: [
          { date: new Date("2026-09-01T12:00:00Z"), amount: 10, type: "INCOME", description: "RECARGA" },
        ],
      },
    ], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-02T00:00:00Z") })

    expect(evolution.averageDaily).toBe(0)
    expect(evolution.movementEnd).toBe("2026-09-01")
  })

  it("lista os gastos do dia ordenados, sem ajustes e limitados a 4", () => {
    const evolution = buildBenefitEvolution([
      {
        initialBalance: 0,
        movements: [
          { date: new Date("2026-09-02T09:00:00Z"), amount: 5, type: "EXPENSE", description: "A" },
          { date: new Date("2026-09-02T10:00:00Z"), amount: 25, type: "EXPENSE", description: "B" },
          { date: new Date("2026-09-02T11:00:00Z"), amount: 10, type: "EXPENSE", description: "C" },
          { date: new Date("2026-09-02T12:00:00Z"), amount: 20, type: "EXPENSE", description: "D" },
          { date: new Date("2026-09-02T13:00:00Z"), amount: 15, type: "EXPENSE", description: "E" },
          { date: new Date("2026-09-02T14:00:00Z"), amount: 99, type: "EXPENSE", description: "AJUSTE IMPORTACAO EXTRATO" },
          { date: new Date("2026-09-02T15:00:00Z"), amount: 50, type: "INCOME", description: "RECARGA" },
        ],
      },
    ], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-03T00:00:00Z") })

    const day = evolution.points.find((point) => point.date === "2026-09-02")
    expect(day?.items.map((item) => item.description)).toEqual(["B", "D", "E", "C"])
    expect(day?.items.map((item) => item.amount)).toEqual([25, 20, 15, 10])
    expect(day?.itemsTotal).toBe(5)
  })

  it("retorna vazio quando não há conta de benefício", () => {
    const evolution = buildBenefitEvolution([], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-30T00:00:00Z") })

    expect(evolution).toEqual({ points: [], credited: 0, spent: 0, currentBalance: 0, averageDaily: 0, movementEnd: null, creditStart: null, lastCreditDate: null, creditDates: [] })
  })

  it("arredonda centavos", () => {
    const evolution = buildBenefitEvolution([
      {
        initialBalance: 0.1,
        movements: [
          { date: new Date("2026-09-01T12:00:00Z"), amount: 0.2, type: "EXPENSE", description: "Compra" },
        ],
      },
    ], { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-01T00:00:00Z") })

    expect(evolution.points[0].balance).toBe(-0.1)
    expect(evolution.spent).toBe(0.2)
  })

  describe("resolveBenefitRechargeAlert", () => {
    it("não alerta antes da folga de 3 dias", () => {
      const alert = resolveBenefitRechargeAlert({
        selectedMonth: "2026-10",
        creditDates: ["2026-08-29"],
        today: new Date("2026-09-19T12:00:00Z"),
      })

      expect(alert).toEqual({ late: false, referenceMonth: "2026-09", daysSinceLastCredit: 21 })
    })

    it("alerta quando o mês de referência fechou sem recarga e passou a folga", () => {
      const alert = resolveBenefitRechargeAlert({
        selectedMonth: "2026-10",
        creditDates: ["2026-08-29"],
        today: new Date("2026-09-28T12:00:00Z"),
      })

      expect(alert.late).toBe(true)
      expect(alert.referenceMonth).toBe("2026-09")
    })

    it("não alerta quando houve recarga no mês de referência", () => {
      const alert = resolveBenefitRechargeAlert({
        selectedMonth: "2026-10",
        creditDates: ["2026-09-05"],
        today: new Date("2026-09-28T12:00:00Z"),
      })

      expect(alert.late).toBe(false)
    })

    it("não alerta para mês selecionado no passado", () => {
      const alert = resolveBenefitRechargeAlert({
        selectedMonth: "2026-09",
        creditDates: ["2026-08-29"],
        today: new Date("2026-09-28T12:00:00Z"),
      })

      expect(alert.late).toBe(false)
    })

    it("não alerta quando o mês de referência teve recarga mesmo com uma recarga mais nova depois", () => {
      const alert = resolveBenefitRechargeAlert({
        selectedMonth: "2026-09",
        creditDates: ["2026-08-29", "2026-09-05"],
        today: new Date("2026-09-28T12:00:00Z"),
      })

      expect(alert.late).toBe(false)
      expect(alert.daysSinceLastCredit).toBe(23)
    })
  })
})
