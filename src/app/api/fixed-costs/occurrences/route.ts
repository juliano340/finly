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
  const type = url.searchParams.get("type") as "INCOME" | "EXPENSE" | null
  if (!month) {
    return NextResponse.json({ error: "Mês é obrigatório" }, { status: 400 })
  }

  const userId = session.user.id

  try {
    const where = type
      ? { userId, month, fixedCost: { type } }
      : { userId, month }

    const occurrences = await prisma.fixedCostOccurrence.findMany({
      where,
      include: {
        fixedCost: {
          include: { category: true, card: true, bankAccount: true },
        },
      },
      orderBy: { fixedCost: { name: "asc" } },
    })

    return NextResponse.json(occurrences)
  } catch {
    return NextResponse.json([])
  }
}
