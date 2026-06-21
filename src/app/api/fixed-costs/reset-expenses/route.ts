import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resetExpenseFixedCosts } from "@/features/fixed-costs/fixed-costs.service"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const result = await resetExpenseFixedCosts(session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[POST /api/fixed-costs/reset-expenses] error:", err)
    return NextResponse.json({ error: "Erro ao zerar despesas fixas" }, { status: 500 })
  }
}
