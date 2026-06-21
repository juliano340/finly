import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { ids } = await request.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Nenhum ID informado" }, { status: 400 })
  }

  const result = await prisma.fixedCostOccurrence.deleteMany({
    where: { id: { in: ids }, userId: session.user.id },
  })

  return NextResponse.json({ deleted: result.count })
}
