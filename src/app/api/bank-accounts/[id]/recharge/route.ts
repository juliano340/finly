import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { benefitRechargeSchema } from "@/features/bank-accounts/bank-accounts.schema"
import { rechargeBenefitAccount } from "@/features/bank-accounts/bank-accounts.service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = benefitRechargeSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const { id } = await params
  const movement = await rechargeBenefitAccount(id, session.user.id, parsed.data)
  if (!movement) return NextResponse.json({ error: "Conta de benefício inválida" }, { status: 400 })
  return NextResponse.json(movement, { status: 201 })
}
