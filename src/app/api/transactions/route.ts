import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTransactions, createTransaction } from "@/features/transactions/transactions.service"
import { transactionSchema } from "@/features/transactions/transactions.schema"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const filters = {
    type: url.searchParams.get("type") as "INCOME" | "EXPENSE" | undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    month: url.searchParams.get("month") ?? undefined,
    page: parseInt(url.searchParams.get("page") ?? "1"),
    limit: parseInt(url.searchParams.get("limit") ?? "20"),
  }

  const result = await getTransactions(session.user.id, filters)
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const tx = await createTransaction(session.user.id, parsed.data)
  return NextResponse.json(tx, { status: 201 })
}
