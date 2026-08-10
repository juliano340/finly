import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getMonthlyPlan,
  updateMonthlyPlan,
} from "@/features/monthly-plan/monthly-plan.service"
import {
  isMonthWithinSupportedWindow,
  monthSchema,
  monthlyPlanQuerySchema,
  monthlyPlanUpdateSchema,
} from "@/features/monthly-plan/monthly-plan.schema"

export const dynamic = "force-dynamic"

const updateRequestSchema = monthlyPlanUpdateSchema
  .extend({ month: monthSchema })
  .strict()

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return json({ error: "Não autorizado" }, 401)

  const searchParams = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = monthlyPlanQuerySchema.safeParse(searchParams)
  const asOf = new Date()
  if (!parsed.success || !isMonthWithinSupportedWindow(parsed.data.month, asOf)) {
    return json({ error: "Parâmetro 'month' inválido ou fora da janela suportada" }, 400)
  }

  try {
    const plan = await getMonthlyPlan(session.user.id, parsed.data.month, asOf)
    return json(plan)
  } catch {
    return json({ error: "Erro ao buscar plano mensal" }, 500)
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return json({ error: "Não autorizado" }, 401)
  if (!hasAllowedOrigin(request)) return json({ error: "Origem não permitida" }, 403)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Dados inválidos" }, 400)
  }

  const parsed = updateRequestSchema.safeParse(body)
  const asOf = new Date()
  if (!parsed.success) {
    return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400)
  }
  if (!isMonthWithinSupportedWindow(parsed.data.month, asOf)) {
    return json({ error: "Mês fora da janela suportada" }, 400)
  }

  const { month, ...input } = parsed.data
  try {
    const plan = await updateMonthlyPlan(session.user.id, month, input, asOf)
    return json(plan)
  } catch {
    return json({ error: "Erro ao atualizar plano mensal" }, 500)
  }
}

function hasAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}
