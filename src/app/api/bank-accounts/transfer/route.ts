import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bankAccountTransferSchema } from "@/features/bank-accounts/bank-accounts.schema"
import { transferBetweenBankAccounts } from "@/features/bank-accounts/bank-accounts.service"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = bankAccountTransferSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const transfer = await transferBetweenBankAccounts(session.user.id, parsed.data)
  if (!transfer) return NextResponse.json({ error: "Contas inválidas" }, { status: 400 })

  return NextResponse.json(transfer, { status: 201 })
}
