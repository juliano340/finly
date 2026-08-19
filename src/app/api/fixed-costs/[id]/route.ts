import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fixedCostOccurrenceAmountUpdateSchema, fixedCostSeriesUpdateSchema } from "@/features/fixed-costs/fixed-costs.schema"
import { deleteFixedCost, DuplicateFixedCostNameError, ProtectedFixedCostOccurrenceError, StaleFixedCostOccurrenceError, updateFixedCost, updateFixedCostOccurrenceAmount } from "@/features/fixed-costs/fixed-costs.service"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = fixedCostOccurrenceAmountUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { id } = await params
  let result
  try {
    result = await updateFixedCostOccurrenceAmount(id, session.user.id, parsed.data)
  } catch (err) {
    if (err instanceof StaleFixedCostOccurrenceError) {
      return NextResponse.json({ error: err.message, conflict: "STALE_OCCURRENCE" }, { status: 409 })
    }
    if (err instanceof ProtectedFixedCostOccurrenceError) {
      return NextResponse.json({ error: err.message, conflict: "PROTECTED_OCCURRENCE", reason: err.reason }, { status: 409 })
    }
    console.error("[PUT /api/fixed-costs/:id] error:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
  if (!result) {
    return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 })
  }

  return NextResponse.json(result)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = fixedCostSeriesUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { id } = await params
  try {
    const fixedCost = await updateFixedCost(id, session.user.id, parsed.data)
    if (!fixedCost) {
      return NextResponse.json({ error: "Custo fixo não encontrado" }, { status: 404 })
    }
    return NextResponse.json(fixedCost)
  } catch (err) {
    if (err instanceof DuplicateFixedCostNameError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error("[PATCH /api/fixed-costs/:id] error:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
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
