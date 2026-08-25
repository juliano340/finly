import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateTransaction, deleteTransaction } from "@/features/transactions/transactions.service"
import { transactionUpdateSchema } from "@/features/transactions/transactions.schema"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const parsed = transactionUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    const updated = await updateTransaction(id, session.user.id, parsed.data)

    if (!updated) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar transação" },
      { status: 400 }
    )
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
  const deleted = await deleteTransaction(id, session.user.id)

  if (!deleted) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
