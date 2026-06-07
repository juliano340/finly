import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBudgets, createBudget, getBudgetSummary } from "@/features/budgets/budgets.service"
import { budgetSchema } from "@/features/budgets/budgets.schema"

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

  const [budgets, summary] = await Promise.all([
    getBudgets(session.user.id, month),
    getBudgetSummary(session.user.id, month),
  ])

  return NextResponse.json({ budgets, summary })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const result = budgetSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: result.error.issues },
      { status: 400 }
    )
  }

  try {
    const budget = await createBudget(session.user.id, result.data)
    return NextResponse.json(budget, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar orçamento" },
      { status: 500 }
    )
  }
}
