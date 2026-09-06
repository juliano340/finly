import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { changePassword, setInitialPassword } from "@/features/auth/auth.service"
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  const result = user.passwordHash
    ? await changePassword(session.user.id, body ?? {}, prisma)
    : await setInitialPassword(session.user.id, { newPassword: body?.newPassword }, prisma)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(
    { message: user.passwordHash ? "Senha alterada com sucesso." : "Senha definida com sucesso." }
  )
}
