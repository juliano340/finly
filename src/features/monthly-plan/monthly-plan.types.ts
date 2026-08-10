export const BUSINESS_TIME_ZONE = "America/Sao_Paulo"

export type MonthlyPlanStatusCode = "NORMAL" | "ATTENTION" | "RISK"
export type MonthlyPlanIncomeSource = "SUGGESTED" | "OVERRIDE"

export interface MonthlyPlanStatusInfo {
  code: MonthlyPlanStatusCode
  label: string
  reason: string
}

export interface MonthlyPlanProjection {
  month: string
  plannedIncome: number
  committedExpenses: number
  savingsGoal: number
  safetyMargin: number
  variableSpent: number
  plannedBalance: number
  projectedSavings: number
  variableAvailable: number
  dailySafeLimit: number
  daysRemaining: number
  status: MonthlyPlanStatusInfo
}

export interface MonthlyPlanDto extends MonthlyPlanProjection {
  incomeOverride: number | null
  suggestedIncome: number
  incomeSource: MonthlyPlanIncomeSource
}

export interface MonthlyPlanUpdateInput {
  incomeOverride: number | null
  savingsGoal: number
  safetyMargin: number
}
