import { occurrenceDueDate } from "@/lib/recurrence"

export type FixedCostPaymentMethod = "PIX" | "BANK_SLIP" | "DEBIT" | "CREDIT_CARD" | "CASH"

export interface OccurrencePaymentSource {
  month: string
  scheduledDate: Date | string | null
  dueDate: Date | string | null
  paymentMethodOverride: FixedCostPaymentMethod | string | null
  cardIdOverride: string | null
  bankAccountIdOverride: string | null
  dueDateOverridden?: boolean
  fixedCost: {
    type?: "INCOME" | "EXPENSE" | string
    paymentMethod: FixedCostPaymentMethod | string
    paidInsideCard: boolean
    cardId: string | null
    bankAccountId: string | null
    dueDay: number | null
  }
}

function asDate(value: Date | string | null): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

export interface ResolvedOccurrencePayment {
  paymentMethod: string
  paidInsideCard: boolean
  cardId: string | null
  bankAccountId: string | null
}

export function resolveOccurrencePayment(occurrence: OccurrencePaymentSource): ResolvedOccurrencePayment {
  const paymentMethod = occurrence.paymentMethodOverride ?? occurrence.fixedCost.paymentMethod
  return {
    paymentMethod,
    paidInsideCard: occurrence.paymentMethodOverride !== null
      ? paymentMethod === "CREDIT_CARD"
      : occurrence.fixedCost.paidInsideCard,
    cardId: occurrence.cardIdOverride ?? occurrence.fixedCost.cardId,
    bankAccountId: occurrence.bankAccountIdOverride ?? occurrence.fixedCost.bankAccountId,
  }
}

export function defaultOccurrenceDueDate(occurrence: OccurrencePaymentSource): Date {
  const scheduledDate = asDate(occurrence.scheduledDate)
  if (scheduledDate) {
    return occurrenceDueDate(scheduledDate, occurrence.fixedCost.dueDay)
  }
  const [year, month] = occurrence.month.split("-").map(Number)
  return occurrenceDueDate(new Date(year, month - 1, 1), occurrence.fixedCost.dueDay)
}

export function isOccurrenceDueDateOverridden(occurrence: OccurrencePaymentSource): boolean {
  return occurrence.dueDateOverridden === true
}

export function isOccurrenceCustomized(occurrence: OccurrencePaymentSource): boolean {
  const hasOverride = (value: unknown) => value !== null && value !== undefined
  return (
    hasOverride(occurrence.paymentMethodOverride) ||
    hasOverride(occurrence.cardIdOverride) ||
    hasOverride(occurrence.bankAccountIdOverride) ||
    isOccurrenceDueDateOverridden(occurrence)
  )
}
