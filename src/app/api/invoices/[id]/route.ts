import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cardInvoiceSchema } from "@/features/card-invoices/card-invoices.schema"
import { InvoiceLockedError, deleteCardInvoice, updateCardInvoice } from "@/features/card-invoices/card-invoices.service"

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
  try {
    const invoice = await updateCardInvoice(id, session.user.id, parsed.data)
    if (!invoice) {
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
    }
    return NextResponse.json(invoice)
  } catch (err) {
    if (err instanceof InvoiceLockedError) {
      return NextResponse.json({ error: err.message, conflict: "INVOICE_LOCKED" }, { status: 409 })
    }
    console.error("[PUT /api/invoices/:id] error:", err)
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
  const deleted = await deleteCardInvoice(id, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
