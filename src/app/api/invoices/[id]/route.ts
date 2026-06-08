import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cardInvoiceSchema } from "@/features/card-invoices/card-invoices.schema"
import { deleteCardInvoice, updateCardInvoice } from "@/features/card-invoices/card-invoices.service"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = cardInvoiceSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { id } = await params
  const invoice = await updateCardInvoice(id, session.user.id, parsed.data)
  if (!invoice) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
  }

  return NextResponse.json(invoice)
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
  const deleted = await deleteCardInvoice(id, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
