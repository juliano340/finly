import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBankAccountOptions } from "@/features/bank-accounts/bank-accounts.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const accounts = await getBankAccountOptions(session.user.id)
  return NextResponse.json(accounts)
}
