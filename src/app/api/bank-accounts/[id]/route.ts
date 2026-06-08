import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bankAccountSchema } from "@/features/bank-accounts/bank-accounts.schema"
import { deleteBankAccount, updateBankAccount } from "@/features/bank-accounts/bank-accounts.service"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = bankAccountSchema.partial().safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { id } = await params
  const account = await updateBankAccount(id, session.user.id, parsed.data)
  if (!account) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  return NextResponse.json(account)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const deleted = await deleteBankAccount(id, session.user.id)
  if (!deleted) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  return NextResponse.json({ success: true })
}
