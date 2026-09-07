import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { consumeIpRateLimit } from "@/features/auth/request-rate-limit.service"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  const credentials = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })

  return NextResponse.json({ ...user, hasPassword: Boolean(credentials?.passwordHash) })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = updateProfileSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}

const deleteAccountSchema = z.object({ password: z.string().min(1) })
const deleteAccountOAuthSchema = z.object({ confirmEmail: z.string().min(1) })
const DELETE_ACCOUNT_RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 }
const RECENT_LOGIN_WINDOW_SEC = 10 * 60

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (await consumeIpRateLimit(request, "delete-account", DELETE_ACCOUNT_RATE_LIMIT)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  if (user.passwordHash) {
    const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Informe sua senha para excluir a conta." }, { status: 400 })
    }

    if (!(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 400 })
    }
  } else {
    // Conta OAuth (sem senha): exige sessão recente + confirmação por e-mail
    // digitado, para que um sequestrador de sessão antigo não apague a conta.
    const loginAt = (session as { loginAt?: number }).loginAt ?? 0
    const recentLogin = Date.now() / 1000 - loginAt < RECENT_LOGIN_WINDOW_SEC
    const parsed = deleteAccountOAuthSchema.safeParse(await request.json().catch(() => null))
    const confirmEmail = parsed.success ? parsed.data.confirmEmail.trim().toLowerCase() : ""
    const emailMatches = confirmEmail !== "" && confirmEmail === session.user.email?.toLowerCase()

    if (!recentLogin || !emailMatches) {
      return NextResponse.json(
        { error: "Por segurança, faça login novamente e digite seu e-mail para confirmar a exclusão." },
        { status: 403 }
      )
    }
  }

  await prisma.user.delete({ where: { id: session.user.id } })
  return NextResponse.json({ message: "Conta excluída com sucesso." })
}
