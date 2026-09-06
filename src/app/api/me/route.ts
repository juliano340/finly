import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

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
      passwordHash: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ ...user, passwordHash: undefined, hasPassword: Boolean(user.passwordHash) })
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

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
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
  }

  await prisma.user.delete({ where: { id: session.user.id } })
  return NextResponse.json({ message: "Conta excluída com sucesso." })
}
