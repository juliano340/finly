import type { PrismaClient } from "@/generated/prisma"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
})

export type RegisterInput = z.infer<typeof registerSchema>

export async function registerUser(input: RegisterInput, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const parsed = registerSchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "Email já cadastrado" }
  }

  const passwordHash = await hash(password, 12)

  const user = await db.user.create({
    data: { name, email, passwordHash },
  })

  return { user }
}
