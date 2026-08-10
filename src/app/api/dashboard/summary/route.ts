import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBankAccountsTotal } from "@/features/bank-accounts/bank-accounts.service"
import {
  getCardInvoiceEvolution,
  getDashboardStats,
  getMonthlyEvolution,
} from "@/features/dashboard/dashboard.service"
import { getMonthlyClosingSummary } from "@/features/monthly-closing/monthly-closing.service"
import { getMonthlyPlan } from "@/features/monthly-plan/monthly-plan.service"
import {
  isMonthWithinSupportedWindow,
  monthSchema,
} from "@/features/monthly-plan/monthly-plan.schema"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return json({ error: "Não autorizado" }, 401)
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const monthsParam = Number(searchParams.get("months") ?? 6)
  const months = Number.isFinite(monthsParam) ? Math.min(Math.max(monthsParam, 1), 24) : 6

  const asOf = new Date()
  const parsedMonth = monthSchema.safeParse(month)
  if (!parsedMonth.success || !isMonthWithinSupportedWindow(parsedMonth.data, asOf)) {
    return json(
      { error: "Parâmetro 'month' inválido ou fora da janela suportada" },
      400,
    )
  }

  const requestedMonth = parsedMonth.data
  const userId = session.user.id
  const [stats, bankTotal, closingSummary, evolution, cardEvolution, monthlyPlan] = await Promise.all([
    getDashboardStats(userId, requestedMonth, prisma),
    getBankAccountsTotal(userId, prisma),
    getMonthlyClosingSummary(userId, requestedMonth, prisma),
    getMonthlyEvolution(userId, requestedMonth, months, prisma),
    getCardInvoiceEvolution(userId, requestedMonth, months, prisma),
    getMonthlyPlan(userId, requestedMonth, asOf, prisma),
  ])

  return json({
    stats,
    bankTotal,
    closing: { summary: closingSummary },
    evolution,
    cardEvolution,
    monthlyPlan,
  })
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}
