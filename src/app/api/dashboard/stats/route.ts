import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDashboardStats } from "@/features/dashboard/dashboard.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Parâmetro 'month' obrigatório (YYYY-MM)" },
      { status: 400 }
    )
  }

  const stats = await getDashboardStats(session.user.id, month)
  return NextResponse.json(stats)
}
