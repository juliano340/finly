import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const name = url.searchParams.get("name")

  const fixedCosts = await prisma.fixedCost.findMany({
    where: {
      userId: session.user.id,
      ...(name ? { name: { contains: name } } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      defaultAmount: true,
      occurrences: {
        select: { id: true, month: true, amount: true, status: true },
        orderBy: { month: "desc" },
      },
    },
  })

  return NextResponse.json(fixedCosts)
}
