import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id
  const body = await request.json()
  const { paymentMethod, bankAccountId } = body as { paymentMethod?: string; bankAccountId?: string }

  if (!paymentMethod) {
    return NextResponse.json({ error: "Método de pagamento é obrigatório" }, { status: 400 })
  }

  const invoice = await prisma.cardInvoice.findUnique({
    where: { id },
    include: { card: true },
  })
  if (!invoice || invoice.userId !== userId) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
  }
  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "Fatura já está paga" }, { status: 400 })
  }

  return prisma.$transaction(async (tx) => {
    let movementId: string | null = null

    if (bankAccountId) {
      const account = await tx.bankAccount.findUnique({ where: { id: bankAccountId } })
      if (!account || account.userId !== userId) {
        throw new Error("Conta não encontrada")
      }

      const movement = await tx.bankAccountMovement.create({
        data: {
          bankAccountId,
          amount: invoice.amount,
          type: "EXPENSE",
          description: `PAGAMENTO_FATURA:${id}`,
          date: new Date(),
          userId,
        },
      })
      movementId = movement.id
    }

    const updated = await tx.cardInvoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentMethod,
        paymentBankAccountId: bankAccountId ?? null,
        bankAccountMovementId: movementId,
      },
      include: { card: true },
    })

    return NextResponse.json(updated)
  })
}
