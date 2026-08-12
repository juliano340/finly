import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteCardInvoiceItem } from "@/features/card-invoices/card-invoices.service"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id, itemId } = await params
  const deleted = await deleteCardInvoiceItem(id, itemId, session.user.id)
  if (!deleted) return NextResponse.json({ error: "Item não encontrado ou fatura bloqueada" }, { status: 400 })
  return NextResponse.json({ success: true })
}
