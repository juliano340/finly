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

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const monthsParam = Number(searchParams.get("months") ?? 6)
  const months = Number.isFinite(monthsParam) ? Math.min(Math.max(monthsParam, 1), 24) : 6

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Parâmetro 'month' obrigatório (YYYY-MM)" },
      { status: 400 }
    )
  }

  const userId = session.user.id
  const [stats, bankTotal, closingSummary, evolution, cardEvolution] = await Promise.all([
    getDashboardStats(userId, month, prisma),
    getBankAccountsTotal(userId, prisma),
    getMonthlyClosingSummary(userId, month, prisma),
    getMonthlyEvolution(userId, month, months, prisma),
    getCardInvoiceEvolution(userId, month, months, prisma),
  ])

  return NextResponse.json({
    stats,
    bankTotal,
    closing: { summary: closingSummary },
    evolution,
    cardEvolution,
  })
}
