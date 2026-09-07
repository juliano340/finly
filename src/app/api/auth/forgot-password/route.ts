import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { forgotPasswordSchema } from "@/features/auth/password-reset.schema"
import {
  createPasswordResetToken,
  RateLimitError,
} from "@/features/auth/password-reset.service"
import { consumeIpRateLimit } from "@/features/auth/request-rate-limit.service"
import { sendEmail } from "@/lib/email"
import { passwordResetTemplate } from "@/lib/email-templates"

const TOKEN_TTL_MINUTES = 30
const FORGOT_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }

export async function POST(request: Request) {
  try {
    if (await consumeIpRateLimit(request, "forgot-password", FORGOT_RATE_LIMIT)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }

    const { email } = parsed.data

    try {
      const plainToken = await createPasswordResetToken(email, prisma)

      if (plainToken) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { name: true },
        })

        const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000"
        const resetUrl = `${baseUrl}/reset-password?token=${plainToken}`

        try {
          await sendEmail({
            to: email,
            subject: "Recuperação de senha — Finly",
            html: passwordResetTemplate({
              userName: user?.name ?? null,
              resetUrl,
              expiresInMinutes: TOKEN_TTL_MINUTES,
            }),
          })
        } catch (emailError) {
          console.error("[forgot-password] falha ao enviar email:", emailError)
        }
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          { error: "Aguarde alguns minutos antes de solicitar um novo link." },
          { status: 429 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { message: "Se o email existir, enviamos um link de recuperação." },
      { status: 200 }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}