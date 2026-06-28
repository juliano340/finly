import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateTransactionCategory } from "@/features/pdf-import/pdf-import.service"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id: invoiceId, transactionId } = await params
  const body = await request.json()
  const { categoryId } = body as { categoryId: string | null }

  const invoice = await prisma.cardInvoice.findFirst({
    where: { id: invoiceId, userId: session.user.id },
    select: { importSessionId: true },
  })

  if (!invoice?.importSessionId) {
    return NextResponse.json({ error: "Fatura não tem importação" }, { status: 404 })
  }

  const transaction = await prisma.importedTransaction.findFirst({
    where: {
      id: transactionId,
      importSessionId: invoice.importSessionId,
      userId: session.user.id,
    },
  })

  if (!transaction) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
  }

  await updateTransactionCategory(transactionId, categoryId, session.user.id)

  const updated = await prisma.importedTransaction.findUnique({
    where: { id: transactionId },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(updated)
}
