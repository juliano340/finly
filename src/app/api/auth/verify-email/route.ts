import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  EmailVerificationTokenExpiredError,
  EmailVerificationTokenInvalidError,
  verifyEmail,
} from "@/features/auth/email-verification.service"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token : ""

  if (!token) return NextResponse.json({ error: "Link inválido." }, { status: 400 })

  try {
    await verifyEmail(token, prisma)
    return NextResponse.json({ message: "E-mail confirmado com sucesso." })
  } catch (error) {
    if (error instanceof EmailVerificationTokenExpiredError) {
      return NextResponse.json({ error: "Este link expirou. Solicite um novo e-mail de confirmação." }, { status: 400 })
    }
    if (error instanceof EmailVerificationTokenInvalidError) {
      return NextResponse.json({ error: "Este link é inválido ou já foi usado." }, { status: 400 })
    }
    console.error("[verify-email]", error)
    return NextResponse.json({ error: "Não foi possível confirmar o e-mail." }, { status: 500 })
  }
}
