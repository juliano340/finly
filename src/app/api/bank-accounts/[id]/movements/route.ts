import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bankAccountMovementSchema } from "@/features/bank-accounts/bank-accounts.schema"
import { createBankAccountMovement } from "@/features/bank-accounts/bank-accounts.service"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = bankAccountMovementSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { id } = await params
  const movement = await createBankAccountMovement(id, session.user.id, parsed.data)
  if (!movement) return NextResponse.json({ error: "Conta inválida" }, { status: 400 })

  return NextResponse.json(movement, { status: 201 })
}
