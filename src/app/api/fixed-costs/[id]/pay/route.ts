import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { payFixedCostOccurrence } from "@/features/monthly-closing/monthly-closing.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(request.url)
  const month = url.searchParams.get("month") ?? currentMonth()
  const userId = session.user.id

  const fixedCost = await prisma.fixedCost.findUnique({ where: { id } })
  if (!fixedCost || fixedCost.userId !== userId) {
    return NextResponse.json({ error: "Custo fixo não encontrado" }, { status: 404 })
  }

  const financialMonth = await ensureFinancialMonth(userId, month, prisma)
  await ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma)

  const occurrence = await prisma.fixedCostOccurrence.findFirst({
    where: { fixedCostId: id, month, userId, status: "PENDING" },
    orderBy: { dueDate: { sort: "asc", nulls: "last" } },
  })

  if (!occurrence) {
    return NextResponse.json({ error: "Nenhuma ocorrência pendente encontrada" }, { status: 404 })
  }

  const paid = await payFixedCostOccurrence(occurrence.id, userId, prisma)
  if (!paid) {
    return NextResponse.json({ error: "Erro ao pagar" }, { status: 400 })
  }

  return NextResponse.json(paid)
}
