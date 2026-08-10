import { z } from "zod"
import { TZDate } from "@date-fns/tz"
import { BUSINESS_TIME_ZONE } from "./monthly-plan.types"

const MONTH_REGEX = /^\d{4}-\d{2}$/
const MAX_MONEY = 99999999.99

function isValidSemanticMonth(value: string): boolean {
  const month = Number(value.slice(5, 7))
  return Number.isInteger(month) && month >= 1 && month <= 12
}

export const monthSchema = z
  .string()
  .regex(MONTH_REGEX, "Formato inválido. Use AAAA-MM")
  .refine(isValidSemanticMonth, { message: "Mês inválido" })

export const moneySchema = z.coerce
  .number()
  .finite("Valor deve ser finito")
  .nonnegative("Valor não pode ser negativo")
  .max(MAX_MONEY, "Valor muito alto")

export const monthlyPlanUpdateSchema = z
  .object({
    incomeOverride: z.coerce
      .number()
      .finite("Valor deve ser finito")
      .nonnegative("Valor não pode ser negativo")
      .max(MAX_MONEY, "Valor muito alto")
      .nullable(),
    savingsGoal: moneySchema,
    safetyMargin: moneySchema,
  })
  .strict()

export const monthlyPlanQuerySchema = z
  .object({
    month: monthSchema,
  })
  .strict()

export function getBusinessMonthKey(asOf: Date): string {
  const { year, month } = businessDateParts(asOf)
  return `${year}-${String(month).padStart(2, "0")}`
}

export function getSupportedMonthWindow(asOf: Date = new Date()): { min: string; max: string } {
  const { year } = businessDateParts(asOf)
  return { min: `${year - 1}-01`, max: `${year + 1}-12` }
}

export function isMonthWithinSupportedWindow(month: string, asOf: Date = new Date()): boolean {
  const { min, max } = getSupportedMonthWindow(asOf)
  return month >= min && month <= max
}

function businessDateParts(asOf: Date): { year: number; month: number } {
  const zoned = new TZDate(asOf.getTime(), BUSINESS_TIME_ZONE)
  return { year: zoned.getFullYear(), month: zoned.getMonth() + 1 }
}
