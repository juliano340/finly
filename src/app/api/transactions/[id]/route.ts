import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateTransaction, deleteTransaction } from "@/features/transactions/transactions.service"

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
  const updated = await updateTransaction(id, session.user.id, body)

  if (!updated) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
  }

  return NextResponse.json(updated)
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
