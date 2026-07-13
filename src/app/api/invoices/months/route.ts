import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCardInvoiceMonths } from "@/features/card-invoices/card-invoices.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const months = await getCardInvoiceMonths(session.user.id)
  return NextResponse.json(months)
}
