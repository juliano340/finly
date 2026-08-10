import { Prisma } from "@/generated/prisma/client"
import { TZDate } from "@date-fns/tz"
import { differenceInCalendarDays } from "date-fns"
import { getBusinessMonthKey } from "./monthly-plan.schema"
import {
  BUSINESS_TIME_ZONE,
  type MonthlyPlanProjection,
  type MonthlyPlanStatusInfo,
  type MonthlyPlanStatusCode,
} from "./monthly-plan.types"

export interface MonthlyPlanCalculationInput {
  month: string
  asOf: Date
  plannedIncome: Prisma.Decimal
  committedExpenses: Prisma.Decimal
  savingsGoal: Prisma.Decimal
  safetyMargin: Prisma.Decimal
  variableSpent: Prisma.Decimal
}

const STATUS_LABELS: Record<MonthlyPlanStatusCode, string> = {
  NORMAL: "Dentro da meta",
  ATTENTION: "Atenção",
  RISK: "Meta ameaçada",
}

export function getDaysRemaining(month: string, asOf: Date): number {
  const currentMonth = getBusinessMonthKey(asOf)
  if (month < currentMonth) return 0
  if (month > currentMonth) return calendarDaysInMonth(month)
  const today = new TZDate(asOf.getTime(), BUSINESS_TIME_ZONE)
  return differenceInCalendarDays(nextMonthStart(month), today)
}

export function calculateMonthlyPlan(input: MonthlyPlanCalculationInput): MonthlyPlanProjection {
  const daysRemaining = getDaysRemaining(input.month, input.asOf)

  const plannedBalance = input.plannedIncome.minus(input.committedExpenses)
  const projectedSavings = plannedBalance.minus(input.variableSpent)
  const variableAvailable = projectedSavings
    .minus(input.savingsGoal)
    .minus(input.safetyMargin)
  const dailySafeLimit =
    daysRemaining > 0 && variableAvailable.greaterThan(0)
      ? variableAvailable.div(daysRemaining).toDecimalPlaces(2).toNumber()
      : 0

  return {
    month: input.month,
    plannedIncome: input.plannedIncome.toDecimalPlaces(2).toNumber(),
    committedExpenses: input.committedExpenses.toDecimalPlaces(2).toNumber(),
    savingsGoal: input.savingsGoal.toDecimalPlaces(2).toNumber(),
    safetyMargin: input.safetyMargin.toDecimalPlaces(2).toNumber(),
    variableSpent: input.variableSpent.toDecimalPlaces(2).toNumber(),
    plannedBalance: plannedBalance.toDecimalPlaces(2).toNumber(),
    projectedSavings: projectedSavings.toDecimalPlaces(2).toNumber(),
    variableAvailable: variableAvailable.toDecimalPlaces(2).toNumber(),
    dailySafeLimit,
    daysRemaining,
    status: getStatus(input, daysRemaining),
  }
}

function getStatus(input: MonthlyPlanCalculationInput, daysRemaining: number): MonthlyPlanStatusInfo {
  const projectedSavings = input.plannedIncome
    .minus(input.committedExpenses)
    .minus(input.variableSpent)

  if (projectedSavings.lessThan(input.savingsGoal)) {
    return status("RISK", "A meta de economia está ameaçada pelo saldo projetado.")
  }

  if (projectedSavings.lessThan(input.savingsGoal.plus(input.safetyMargin))) {
    return status("ATTENTION", "A meta está coberta, mas a margem de segurança está comprometida.")
  }

  if (input.month === getBusinessMonthKey(input.asOf) && paceBudgetExceeded(input, daysRemaining)) {
    return status("ATTENTION", "Os gastos variáveis superam o ritmo esperado para os dias decorridos.")
  }

  return status("NORMAL", "Meta e margem cobertas com ritmo dentro do esperado.")
}

function status(code: MonthlyPlanStatusCode, reason: string): MonthlyPlanStatusInfo {
  return { code, label: STATUS_LABELS[code], reason }
}

function paceBudgetExceeded(input: MonthlyPlanCalculationInput, daysRemaining: number): boolean {
  const initialVariableBudget = input.plannedIncome
    .minus(input.committedExpenses)
    .minus(input.savingsGoal)
    .minus(input.safetyMargin)
  if (initialVariableBudget.lessThanOrEqualTo(0)) return false

  const totalDays = calendarDaysInMonth(input.month)
  const elapsedDaysIncludingToday = totalDays - daysRemaining + 1
  const paceBudget = initialVariableBudget.times(elapsedDaysIncludingToday).div(totalDays)
  return input.variableSpent.greaterThan(paceBudget)
}

function calendarDaysInMonth(month: string): number {
  return differenceInCalendarDays(nextMonthStart(month), monthStart(month))
}

function monthStart(month: string): TZDate {
  const [year, monthIndex] = month.split("-").map(Number)
  return new TZDate(year, monthIndex - 1, 1, 0, 0, 0, 0, BUSINESS_TIME_ZONE)
}

function nextMonthStart(month: string): TZDate {
  const [year, monthIndex] = month.split("-").map(Number)
  return new TZDate(year, monthIndex, 1, 0, 0, 0, 0, BUSINESS_TIME_ZONE)
}
