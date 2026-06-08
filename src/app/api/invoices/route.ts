import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cardInvoiceSchema } from "@/features/card-invoices/card-invoices.schema"
import { createCardInvoice, getCardInvoices } from "@/features/card-invoices/card-invoices.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const invoices = await getCardInvoices(
    session.user.id,
    url.searchParams.get("month") ?? undefined
  )
  return NextResponse.json(invoices)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = cardInvoiceSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const invoice = await createCardInvoice(session.user.id, parsed.data)
  if (!invoice) {
    return NextResponse.json({ error: "Cartão inválido" }, { status: 400 })
  }

  return NextResponse.json(invoice, { status: 201 })
}
