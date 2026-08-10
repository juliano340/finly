import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"
import { moneyToNumber } from "@/lib/money"
import { calculateMonthlyPlan } from "./monthly-plan.calculator"
import {
  isMonthWithinSupportedWindow,
  monthSchema,
} from "./monthly-plan.schema"
import { loadMonthlyFinancialSources } from "./monthly-plan.sources"
import type { MonthlyPlanDto, MonthlyPlanUpdateInput } from "./monthly-plan.types"

export class MonthlyPlanMonthError extends RangeError {}

export async function getMonthlyPlan(
  userId: string,
  month: string,
  asOf: Date = new Date(),
  client?: PrismaClient,
): Promise<MonthlyPlanDto> {
  validateRequestedMonth(month, asOf)
  const db = client ?? defaultPrisma
  const financialMonth = await ensureFinancialMonth(userId, month, db)
  await ensureFixedCostOccurrences(userId, month, financialMonth.id, db)

  const [storedPlan, sources] = await Promise.all([
    db.monthlyPlan.findUnique({ where: { month_userId: { month, userId } } }),
    loadMonthlyFinancialSources(userId, month, asOf, db),
  ])
  const incomeOverride = storedPlan?.incomeOverride ?? null
  const savingsGoal = storedPlan?.savingsGoal ?? new Prisma.Decimal(0)
  const safetyMargin = storedPlan?.safetyMargin ?? new Prisma.Decimal(0)
  const plannedIncome = incomeOverride ?? sources.suggestedIncome
  const projection = calculateMonthlyPlan({
    month,
    asOf,
    plannedIncome,
    committedExpenses: sources.committedExpenses,
    savingsGoal,
    safetyMargin,
    variableSpent: sources.variableSpent,
  })

  return {
    ...projection,
    incomeOverride: incomeOverride === null ? null : moneyToNumber(incomeOverride),
    suggestedIncome: moneyToNumber(sources.suggestedIncome),
    incomeSource: incomeOverride === null ? "SUGGESTED" : "OVERRIDE",
  }
}

export async function updateMonthlyPlan(
  userId: string,
  month: string,
  input: MonthlyPlanUpdateInput,
  asOf: Date = new Date(),
  client?: PrismaClient,
): Promise<MonthlyPlanDto> {
  validateRequestedMonth(month, asOf)
  const db = client ?? defaultPrisma
  await db.monthlyPlan.upsert({
    where: { month_userId: { month, userId } },
    update: {
      incomeOverride: input.incomeOverride,
      savingsGoal: input.savingsGoal,
      safetyMargin: input.safetyMargin,
    },
    create: {
      month,
      userId,
      incomeOverride: input.incomeOverride,
      savingsGoal: input.savingsGoal,
      safetyMargin: input.safetyMargin,
    },
  })

  return getMonthlyPlan(userId, month, asOf, db)
}

function validateRequestedMonth(month: string, asOf: Date) {
  if (!monthSchema.safeParse(month).success || !isMonthWithinSupportedWindow(month, asOf)) {
    throw new MonthlyPlanMonthError("Mês fora da janela suportada")
  }
}
