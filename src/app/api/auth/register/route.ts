import { NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { hash } from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./dev.db",
      }),
    })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      await prisma.$disconnect()
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    })

    await prisma.$disconnect()

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
