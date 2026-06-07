import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserPlan, PLANS } from "@/features/billing/billing.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const userPlan = await getUserPlan(session.user.id)
  const plan = PLANS[userPlan.planId] ?? PLANS.free

  return NextResponse.json({
    ...userPlan,
    plan,
  })
}
