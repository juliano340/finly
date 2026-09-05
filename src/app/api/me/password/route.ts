import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { changePassword } from "@/features/auth/auth.service"
import { consumeIpRateLimit } from "@/features/auth/request-rate-limit.service"

const CHANGE_PASSWORD_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (await consumeIpRateLimit(request, "change-password", CHANGE_PASSWORD_RATE_LIMIT)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => null)
  const result = await changePassword(session.user.id, body ?? {}, prisma)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ message: "Senha alterada com sucesso." })
}
