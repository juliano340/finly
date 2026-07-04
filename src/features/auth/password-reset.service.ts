import { createHash, randomUUID } from "crypto"
import { hash } from "bcryptjs"
import type { PrismaClient } from "@/generated/prisma/client"

export class RateLimitError extends Error {
  constructor() {
    super("RATE_LIMIT")
    this.name = "RateLimitError"
  }
}

export class TokenExpiredError extends Error {
  constructor() {
    super("TOKEN_EXPIRED")
    this.name = "TokenExpiredError"
  }
}

export class TokenInvalidError extends Error {
  constructor() {
    super("TOKEN_INVALID")
    this.name = "TokenInvalidError"
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("USER_NOT_FOUND")
    this.name = "UserNotFoundError"
  }
}

const RATE_LIMIT_MS = 10 * 60 * 1000
const TOKEN_TTL_MS = 30 * 60 * 1000

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

/**
 * Cria um token de reset de senha.
 * @returns token em texto plano para envio por email (nunca armazenado em texto plano)
 * @throws UserNotFoundError se email não existir
 * @throws RateLimitError se já existe token criado nos últimos 10min
 */
export async function createPasswordResetToken(
  email: string,
  db: PrismaClient
): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!user) return null

  const recent = await db.verificationToken.findFirst({
    where: {
      identifier: email,
      expires: { gt: new Date(Date.now() + TOKEN_TTL_MS - RATE_LIMIT_MS) },
    },
    select: { token: true },
  })

  if (recent) throw new RateLimitError()

  await db.verificationToken.deleteMany({ where: { identifier: email } })

  const plainToken = randomUUID()
  const hashedToken = sha256(plainToken)

  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })

  return plainToken
}

/**
 * Valida um token de reset (sem consumi-lo).
 * @returns identifier (email) do token
 */
export async function validatePasswordResetToken(
  token: string,
  db: PrismaClient
): Promise<string> {
  const hashedToken = sha256(token)

  const record = await db.verificationToken.findUnique({
    where: { token: hashedToken },
    select: { identifier: true, expires: true },
  })

  if (!record) throw new TokenInvalidError()
  if (record.expires.getTime() < Date.now()) {
    await db.verificationToken.delete({ where: { token: hashedToken } }).catch(() => {})
    throw new TokenExpiredError()
  }

  return record.identifier
}

/**
 * Valida token e atualiza a senha. Token é consumido (single-use).
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  db: PrismaClient
): Promise<void> {
  const email = await validatePasswordResetToken(token, db)
  const hashedToken = sha256(token)

  const passwordHash = await hash(newPassword, 12)

  await db.$transaction([
    db.user.update({
      where: { email },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    }),
    db.verificationToken.delete({ where: { token: hashedToken } }),
  ])
}