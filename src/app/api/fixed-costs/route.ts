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

  const body = await request.json()
  console.log("[POST /api/fixed-costs] body:", JSON.stringify(body))

  const parsed = fixedCostSchema.safeParse(body)
  if (!parsed.success) {
    console.log("[POST /api/fixed-costs] validation error:", parsed.error.format())
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })
  }

  try {
    const fixedCost = await createFixedCost(session.user.id, parsed.data)
    if (!fixedCost) {
      return NextResponse.json({ error: "Categoria ou cartão inválido" }, { status: 400 })
    }
    return NextResponse.json(fixedCost, { status: 201 })
  } catch (err) {
    console.error("[POST /api/fixed-costs] error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 })
  }
}
