import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
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

  const transactions = await prisma.importedTransaction.findMany({
    where: { importSessionId: invoice.importSessionId },
    orderBy: { date: "asc" },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(transactions)
}
