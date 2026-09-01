import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { emailVerificationTemplate } from "@/lib/email-templates"
import {
  createEmailVerificationToken,
  EmailVerificationRateLimitError,
  EMAIL_VERIFICATION_TTL_MINUTES,
} from "@/features/auth/email-verification.service"
import { consumeIpRateLimit } from "@/features/auth/request-rate-limit.service"

const resendSchema = z.object({ email: z.string().email() })
const RESEND_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }
const RESPONSE = { message: "Se houver uma conta pendente para este e-mail, enviaremos um novo link de confirmação." }

export async function POST(request: Request) {
  try {
    if (await consumeIpRateLimit(request, "resend-verification", RESEND_RATE_LIMIT)) {
      return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 })
    }

    const parsed = resendSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })

    const email = parsed.data.email.trim().toLowerCase()
    try {
      const token = await createEmailVerificationToken(email, prisma)
      if (!token) return NextResponse.json(RESPONSE)

      const user = await prisma.user.findUnique({ where: { email }, select: { name: true } })
      const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000"
      await sendEmail({
        to: email,
        subject: "Confirme seu e-mail — Finly",
        html: emailVerificationTemplate({
          userName: user?.name ?? null,
          verificationUrl: `${baseUrl}/verify-email?token=${token}`,
          expiresInMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
        }),
      })
    } catch (error) {
      if (error instanceof EmailVerificationRateLimitError) {
        return NextResponse.json({ error: "Aguarde alguns minutos antes de solicitar outro link." }, { status: 429 })
      }
      await prisma.verificationToken.deleteMany({ where: { identifier: `email-verification:${email}` } })
      console.error("[resend-verification]", error)
      return NextResponse.json({ error: "Não foi possível enviar o e-mail de confirmação." }, { status: 503 })
    }

    return NextResponse.json(RESPONSE)
  } catch (error) {
    console.error("[resend-verification]", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
