import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bankAccountSchema } from "@/features/bank-accounts/bank-accounts.schema"
import { createBankAccount, getBankAccounts } from "@/features/bank-accounts/bank-accounts.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const accounts = await getBankAccounts(session.user.id)
  return NextResponse.json(accounts)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = bankAccountSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const account = await createBankAccount(session.user.id, parsed.data)
  return NextResponse.json(account, { status: 201 })
}
