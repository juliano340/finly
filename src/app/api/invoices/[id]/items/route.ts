import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cardInvoiceItemSchema } from "@/features/card-invoices/card-invoices.schema"
import { createCardInvoiceItem } from "@/features/card-invoices/card-invoices.service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = cardInvoiceItemSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { id } = await params
  const item = await createCardInvoiceItem(id, session.user.id, parsed.data)
  if (!item) return NextResponse.json({ error: "Fatura bloqueada ou vínculo inválido" }, { status: 400 })
  return NextResponse.json(item, { status: 201 })
}
