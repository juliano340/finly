import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bankAccountAdjustmentSchema } from "@/features/bank-accounts/bank-accounts.schema"
import { adjustBankAccountBalance } from "@/features/bank-accounts/bank-accounts.service"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = bankAccountAdjustmentSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { id } = await params
  const movement = await adjustBankAccountBalance(id, session.user.id, parsed.data)
  if (!movement) return NextResponse.json({ error: "Conta inválida ou saldo sem alteração" }, { status: 400 })

  return NextResponse.json(movement, { status: 201 })
}
