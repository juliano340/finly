import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fixedCostPartialSchema } from "@/features/fixed-costs/fixed-costs.schema"
import { deleteFixedCost, updateFixedCost } from "@/features/fixed-costs/fixed-costs.service"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = fixedCostPartialSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { id } = await params
  const fixedCost = await updateFixedCost(id, session.user.id, parsed.data)
  if (!fixedCost) {
    return NextResponse.json({ error: "Custo fixo não encontrado" }, { status: 404 })
  }

  return NextResponse.json(fixedCost)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const deleted = await deleteFixedCost(id, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: "Custo fixo não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
