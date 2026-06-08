import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { copyCardInvoices } from "@/features/card-invoices/card-invoices.service"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { fromMonth, toMonth } = await request.json()
  if (!fromMonth || !toMonth) {
    return NextResponse.json({ error: "fromMonth e toMonth são obrigatórios" }, { status: 400 })
  }

  const invoices = await copyCardInvoices(fromMonth, toMonth, session.user.id)
  return NextResponse.json(invoices)
}
