import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { copyCardInvoices } from "@/features/card-invoices/card-invoices.service"
import { copyCardInvoicesSchema } from "@/features/card-invoices/card-invoices.schema"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = copyCardInvoicesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos. fromMonth e toMonth devem estar no formato YYYY-MM." }, { status: 400 })
  }

  const { fromMonth, toMonth, invoiceIds } = parsed.data
  const invoices = await copyCardInvoices(fromMonth, toMonth, session.user.id, undefined, invoiceIds)
  return NextResponse.json(invoices)
}
