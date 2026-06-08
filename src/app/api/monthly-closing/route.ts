import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMonthlyClosing } from "@/features/monthly-closing/monthly-closing.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const month = url.searchParams.get("month")
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Mês inválido" }, { status: 400 })
  }

  const closing = await getMonthlyClosing(session.user.id, month)
  return NextResponse.json(closing)
}
