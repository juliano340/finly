import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBankAccountsTotal } from "@/features/bank-accounts/bank-accounts.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const total = await getBankAccountsTotal(session.user.id)
  return NextResponse.json({ total })
}
