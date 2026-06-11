import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  const invoice = await prisma.cardInvoice.findUnique({ where: { id } })
  if (!invoice || invoice.userId !== userId) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
  }
  if (invoice.status !== "PAID") {
    return NextResponse.json({ error: "Fatura não está paga" }, { status: 400 })
  }

  return prisma.$transaction(async (tx) => {
    if (invoice.bankAccountMovementId) {
      await tx.bankAccountMovement.delete({
        where: { id: invoice.bankAccountMovementId },
      }).catch(() => {})
    }

    const updated = await tx.cardInvoice.update({
      where: { id },
      data: {
        status: "PENDING",
        paidAt: null,
        paymentMethod: null,
        paymentBankAccountId: null,
        bankAccountMovementId: null,
      },
      include: { card: true },
    })

    return NextResponse.json(updated)
  })
}
