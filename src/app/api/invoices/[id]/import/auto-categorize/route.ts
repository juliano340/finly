import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { autoCategorizeTransactions } from "@/features/pdf-import/pdf-import.service"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id: invoiceId } = await params

  const invoice = await prisma.cardInvoice.findFirst({
    where: { id: invoiceId, userId: session.user.id },
    select: { importSessionId: true },
  })

  if (!invoice?.importSessionId) {
    return NextResponse.json({ error: "Fatura não tem importação" }, { status: 404 })
  }

  const result = await autoCategorizeTransactions(
    invoice.importSessionId,
    session.user.id
  )

  return NextResponse.json(result)
}
