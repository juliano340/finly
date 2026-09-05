import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { payFixedCostOccurrence, FixedCostExpenseLimitError } from "@/features/monthly-closing/monthly-closing.service"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  let occurrence
  try {
    occurrence = await payFixedCostOccurrence(id, session.user.id)
  } catch (error) {
    if (error instanceof FixedCostExpenseLimitError) {
      return NextResponse.json({ error: error.reason }, { status: 400 })
    }
    throw error
  }
  if (!occurrence) {
    return NextResponse.json({ error: "Custo fixo do mês não encontrado" }, { status: 404 })
  }

  return NextResponse.json(occurrence)
}
