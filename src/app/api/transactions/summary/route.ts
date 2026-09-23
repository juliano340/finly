import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTransactionDailySummary } from "@/features/transactions/transactions.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const summary = await getTransactionDailySummary(session.user.id, {
    month: url.searchParams.get("month") ?? undefined,
    type: (url.searchParams.get("type") as "INCOME" | "EXPENSE" | null) ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
  })

  return NextResponse.json(summary)
}
