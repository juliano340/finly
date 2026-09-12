import { describe, expect, it } from "vitest"
import {
  isOccurrenceCustomized,
  isOccurrenceDueDateOverridden,
  resolveOccurrencePayment,
  type OccurrencePaymentSource,
} from "@/features/fixed-costs/occurrence-payment"

function occurrence(overrides: Partial<OccurrencePaymentSource> = {}): OccurrencePaymentSource {
  return {
    month: "2026-09",
    scheduledDate: new Date(2026, 8, 1),
    dueDate: new Date(2026, 8, 10),
    paymentMethodOverride: null,
    cardIdOverride: null,
    bankAccountIdOverride: null,
    dueDateOverridden: false,
    fixedCost: {
      paymentMethod: "PIX",
      paidInsideCard: false,
      cardId: null,
      bankAccountId: "acc_1",
      dueDay: 10,
    },
    ...overrides,
  }
}

describe("resolveOccurrencePayment", () => {
  it("usa a configuração da série quando não há personalização", () => {
    expect(resolveOccurrencePayment(occurrence())).toEqual({
      paymentMethod: "PIX",
      paidInsideCard: false,
      cardId: null,
      bankAccountId: "acc_1",
    })
  })

  it("permite pagar no cartão uma ocorrência de série fora do cartão", () => {
    expect(
      resolveOccurrencePayment(occurrence({
        paymentMethodOverride: "CREDIT_CARD",
        cardIdOverride: "card_1",
      })),
    ).toEqual({
      paymentMethod: "CREDIT_CARD",
      paidInsideCard: true,
      cardId: "card_1",
      bankAccountId: "acc_1",
    })
  })

  it("permite pagar fora do cartão uma ocorrência de série no cartão", () => {
    expect(
      resolveOccurrencePayment(occurrence({
        paymentMethodOverride: "DEBIT",
        fixedCost: {
          paymentMethod: "CREDIT_CARD",
          paidInsideCard: true,
          cardId: "card_1",
          bankAccountId: "acc_1",
          dueDay: 10,
        },
      })),
    ).toEqual({
      paymentMethod: "DEBIT",
      paidInsideCard: false,
      cardId: "card_1",
      bankAccountId: "acc_1",
    })
  })

  it("troca apenas a conta prevista quando só ela é personalizada", () => {
    expect(
      resolveOccurrencePayment(occurrence({ bankAccountIdOverride: "acc_2" })),
    ).toEqual({
      paymentMethod: "PIX",
      paidInsideCard: false,
      cardId: null,
      bankAccountId: "acc_2",
    })
  })
})

describe("isOccurrenceDueDateOverridden", () => {
  it("usa o flag explícito de personalização do vencimento", () => {
    expect(isOccurrenceDueDateOverridden(occurrence())).toBe(false)
    expect(isOccurrenceDueDateOverridden(occurrence({ dueDateOverridden: true }))).toBe(true)
  })

  it("não marca como personalizado apenas por diferença de horário no mesmo dia", () => {
    expect(
      isOccurrenceDueDateOverridden(occurrence({ dueDate: new Date("2026-09-10T00:00:00.000Z") })),
    ).toBe(false)
  })
})

describe("isOccurrenceCustomized", () => {
  it("considera qualquer override de pagamento ou vencimento", () => {
    expect(isOccurrenceCustomized(occurrence())).toBe(false)
    expect(isOccurrenceCustomized(occurrence({ bankAccountIdOverride: "acc_2" }))).toBe(true)
    expect(isOccurrenceCustomized(occurrence({ paymentMethodOverride: "CASH" }))).toBe(true)
    expect(isOccurrenceCustomized(occurrence({ dueDateOverridden: true }))).toBe(true)
  })
})
