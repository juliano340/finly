import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"
import { consumeIpRateLimit } from "@/features/auth/request-rate-limit.service"

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const REGISTER_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }

export async function POST(request: Request) {
  try {
    const limited = await consumeIpRateLimit(request, "register", REGISTER_RATE_LIMIT)
    if (limited) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    })

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
