import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unpayFixedCostOccurrence } from "@/features/monthly-closing/monthly-closing.service"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  const occurrence = await prisma.fixedCostOccurrence.findFirst({
    where: { fixedCostId: id, userId, status: "PAID" },
    orderBy: { paidAt: "desc" },
  })

  if (!occurrence) {
    return NextResponse.json({ error: "Nenhum pagamento encontrado" }, { status: 404 })
  }

  const unpaid = await unpayFixedCostOccurrence(occurrence.id, userId, prisma)
  if (!unpaid) {
    return NextResponse.json({ error: "Erro ao cancelar" }, { status: 400 })
  }

  return NextResponse.json(unpaid)
}
