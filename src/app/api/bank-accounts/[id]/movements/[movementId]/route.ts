import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteBankAccountMovement } from "@/features/bank-accounts/bank-accounts.service"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; movementId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id, movementId } = await params

  const movement = await prisma.bankAccountMovement.findFirst({
    where: { id: movementId, bankAccountId: id, userId: session.user.id },
    select: { id: true },
  })
  if (!movement) return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 })

  const deleted = await deleteBankAccountMovement(movementId, session.user.id)
  if (!deleted) return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 })
  if ("error" in deleted) return NextResponse.json({ error: deleted.error }, { status: 400 })

  return NextResponse.json({ ok: true })
}
