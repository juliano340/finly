import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
})

export type RegisterInput = z.infer<typeof registerSchema>

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
})

const initialPasswordSchema = z.object({
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
})

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

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const parsed = changePasswordSchema.safeParse(input)

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    return { error: typeof firstError === "string" ? firstError : "Dados inválidos" }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user?.passwordHash) {
    return { error: "Usuário não encontrado" }
  }

  const valid = await compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    return { error: "Senha atual incorreta" }
  }

  const passwordHash = await hash(parsed.data.newPassword, 12)

  await db.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  })

  return { ok: true }
}

export async function setInitialPassword(
  userId: string,
  input: { newPassword: string },
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const parsed = initialPasswordSchema.safeParse(input)

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    return { error: typeof firstError === "string" ? firstError : "Dados inválidos" }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user) {
    return { error: "Usuário não encontrado" }
  }
  if (user.passwordHash) {
    return { error: "Este usuário já possui senha" }
  }

  const passwordHash = await hash(parsed.data.newPassword, 12)

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  return { ok: true }
}

export interface GoogleUserInput {
  email: string
  name?: string | null
  image?: string | null
  emailVerified: boolean
}

export async function findOrCreateGoogleUser(input: GoogleUserInput, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const email = input.email?.trim().toLowerCase()
  if (!email || !input.emailVerified) return null

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.image !== input.image) {
      return db.user.update({
        where: { id: existing.id },
        data: { image: input.image },
      })
    }
    return existing
  }

  return db.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      image: input.image ?? null,
      emailVerified: new Date(),
    },
  })
}
