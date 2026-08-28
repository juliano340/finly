import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { batchDeleteTransactions } from "@/features/transactions/transactions.service"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { ids } = (await request.json()) as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Nenhum ID informado" }, { status: 400 })
  }

  const deleted = await batchDeleteTransactions(ids, session.user.id)

  return NextResponse.json({ deleted })
}
