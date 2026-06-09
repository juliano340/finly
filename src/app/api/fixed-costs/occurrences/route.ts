import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const occurrences = await prisma.fixedCostOccurrence.findMany({
    where: { userId: session.user.id, month },
    select: { id: true, fixedCostId: true, status: true, paidAt: true },
  })

  return NextResponse.json(occurrences)
}
