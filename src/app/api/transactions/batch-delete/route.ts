import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { batchDeleteTransactions, permanentBatchDeleteTransactions } from "@/features/transactions/transactions.service"

const batchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Lista de IDs inválida (máximo de 500 por operação)." },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const permanent = url.searchParams.get("permanent") === "true"

  const deleted = permanent
    ? await permanentBatchDeleteTransactions(parsed.data.ids, session.user.id)
    : await batchDeleteTransactions(parsed.data.ids, session.user.id)

  return NextResponse.json({ deleted })
}
