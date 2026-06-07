import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateBudget, deleteBudget } from "@/features/budgets/budgets.service"
import { budgetSchema } from "@/features/budgets/budgets.schema"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const result = budgetSchema.partial().safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: result.error.issues },
      { status: 400 }
    )
  }

  const budget = await updateBudget(id, session.user.id, result.data)
  if (!budget) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
  }

  return NextResponse.json(budget)
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
  const deleted = await deleteBudget(id, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
