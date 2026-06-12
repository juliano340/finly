import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id
    const body = await request.json()
    const { paymentMethod, bankAccountId } = body

    if (!paymentMethod) {
      return NextResponse.json({ error: "Método de pagamento é obrigatório" }, { status: 400 })
    }

    const invoice = await prisma.cardInvoice.findUnique({ where: { id } })
    if (!invoice || invoice.userId !== userId) {
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
    }
    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Fatura já está paga" }, { status: 400 })
    }

    const realBankAccountId = bankAccountId && typeof bankAccountId === "string" && bankAccountId.trim() !== "" ? bankAccountId.trim() : null

    if (realBankAccountId) {
      const account = await prisma.bankAccount.findUnique({ where: { id: realBankAccountId } })
      if (!account || account.userId !== userId) {
        return NextResponse.json({ error: "Conta não encontrada" }, { status: 400 })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      let movementId: string | null = null

      if (realBankAccountId) {
        const movement = await tx.bankAccountMovement.create({
          data: {
            bankAccountId: realBankAccountId,
            amount: invoice.amount,
            type: "EXPENSE",
            description: `PAGAMENTO_FATURA:${id}`,
            date: new Date(),
            userId,
          },
        })
        movementId = movement.id
      }

      return tx.cardInvoice.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentMethod,
          paymentBankAccountId: realBankAccountId,
          bankAccountMovementId: movementId,
        },
        include: { card: true },
      })
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("PAY INVOICE ERROR:", err)
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
