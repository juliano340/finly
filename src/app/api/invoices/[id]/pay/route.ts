import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { markCardInvoiceFixedCostsPaid } from "@/features/monthly-closing/monthly-closing.service"
import { validateExpenseLimit } from "@/features/bank-accounts/bank-accounts.service"
import { moneyToNumber } from "@/lib/money"

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

      const check = await validateExpenseLimit(realBankAccountId, userId, moneyToNumber(invoice.amount), prisma)
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason }, { status: 400 })
      }
    }

    const paidAt = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.cardInvoice.updateMany({
        where: { id, userId, status: "PENDING" },
        data: {
          status: "PAID",
          paidAt,
          paymentMethod,
          paymentBankAccountId: realBankAccountId,
        },
      })
      if (claimed.count !== 1) throw new Error("Fatura já está paga")

      let movementId: string | null = null

      if (realBankAccountId) {
        const movement = await tx.bankAccountMovement.create({
          data: {
            bankAccountId: realBankAccountId,
            amount: invoice.amount,
            type: "EXPENSE",
            description: `PAGAMENTO_FATURA:${id}`,
            date: paidAt,
            userId,
          },
        })
        movementId = movement.id
      }

      await markCardInvoiceFixedCostsPaid(userId, invoice, paidAt, tx)

      return tx.cardInvoice.update({
        where: { id },
        data: {
          bankAccountMovementId: movementId,
        },
        include: { card: true },
      })
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("PAY INVOICE ERROR:", err)
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: message === "Fatura já está paga" ? 400 : 500 })
  }
}
