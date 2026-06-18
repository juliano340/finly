import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fixedCostSchema } from "@/features/fixed-costs/fixed-costs.schema"
import { createFixedCost, getFixedCosts } from "@/features/fixed-costs/fixed-costs.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get("type") as "INCOME" | "EXPENSE" | null

  const fixedCosts = await getFixedCosts(session.user.id)
  const filtered = type ? fixedCosts.filter((fc: { type: string }) => fc.type === type) : fixedCosts
  return NextResponse.json(filtered)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = fixedCostSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const fixedCost = await createFixedCost(session.user.id, parsed.data)
  if (!fixedCost) {
    return NextResponse.json({ error: "Categoria ou cartão inválido" }, { status: 400 })
  }

  return NextResponse.json(fixedCost, { status: 201 })
}
