import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resetPasswordSchema } from "@/features/auth/password-reset.schema"
import {
  resetPassword,
  TokenExpiredError,
  TokenInvalidError,
} from "@/features/auth/password-reset.service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos. A senha deve ter no mínimo 8 caracteres." },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    try {
      await resetPassword(token, password, prisma)
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return NextResponse.json(
          { error: "Link expirado. Solicite um novo link de recuperação." },
          { status: 400 }
        )
      }
      if (error instanceof TokenInvalidError) {
        return NextResponse.json(
          { error: "Link inválido. Solicite um novo link de recuperação." },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ message: "Senha atualizada com sucesso." }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}