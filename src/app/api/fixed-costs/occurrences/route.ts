import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const month = url.searchParams.get("month")
  if (!month) {
    return NextResponse.json({ error: "Mês é obrigatório" }, { status: 400 })
  }

  const userId = session.user.id
  const financialMonth = await ensureFinancialMonth(userId, month, prisma)
  await ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma)

  const occurrences = await prisma.fixedCostOccurrence.findMany({
    where: { userId, month },
    include: {
      fixedCost: {
        include: { category: true, card: true, bankAccount: true },
      },
    },
    orderBy: { fixedCost: { name: "asc" } },
  })

  return NextResponse.json(occurrences)
}
