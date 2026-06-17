import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMonthlyEvolution } from "@/features/dashboard/dashboard.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const months = Number(searchParams.get("months") ?? 6)

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Parâmetro 'month' obrigatório (YYYY-MM)" }, { status: 400 })
  }

  const evolution = await getMonthlyEvolution(session.user.id, month, Number.isFinite(months) ? months : 6)
  return NextResponse.json(evolution)
}
