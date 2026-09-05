import { createHash, randomUUID } from "crypto"
import type { PrismaClient } from "@/generated/prisma/client"

const TOKEN_TTL_MS = 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 10 * 60 * 1000
const IDENTIFIER_PREFIX = "email-verification:"

export class EmailVerificationRateLimitError extends Error {
  constructor(public readonly retryAt: Date) {
    super("EMAIL_VERIFICATION_RATE_LIMIT")
    this.name = "EmailVerificationRateLimitError"
  }
}

export class EmailVerificationTokenExpiredError extends Error {
  constructor() {
    super("EMAIL_VERIFICATION_TOKEN_EXPIRED")
    this.name = "EmailVerificationTokenExpiredError"
  }
}

export class EmailVerificationTokenInvalidError extends Error {
  constructor() {
    super("EMAIL_VERIFICATION_TOKEN_INVALID")
    this.name = "EmailVerificationTokenInvalidError"
  }
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function identifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`
}

export async function createEmailVerificationToken(email: string, db: PrismaClient): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  })

  if (!user || user.emailVerified) return null

  const identifier = identifierFor(email)
  const recent = await db.verificationToken.findFirst({
    where: {
      identifier,
      expires: { gt: new Date(Date.now() + TOKEN_TTL_MS - RESEND_COOLDOWN_MS) },
    },
    select: { expires: true },
  })

  if (recent) {
    const retryAt = new Date(recent.expires.getTime() - TOKEN_TTL_MS + RESEND_COOLDOWN_MS)
    throw new EmailVerificationRateLimitError(retryAt)
  }

  await db.verificationToken.deleteMany({ where: { identifier } })

  const plainToken = randomUUID()
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashToken(plainToken),
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })

  return plainToken
}

export async function verifyEmail(token: string, db: PrismaClient): Promise<void> {
  const hashedToken = hashToken(token)
  const record = await db.verificationToken.findUnique({
    where: { token: hashedToken },
    select: { identifier: true, expires: true },
  })

  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) {
    throw new EmailVerificationTokenInvalidError()
  }

  if (record.expires.getTime() < Date.now()) {
    await db.verificationToken.delete({ where: { token: hashedToken } }).catch(() => {})
    throw new EmailVerificationTokenExpiredError()
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length)
  await db.$transaction([
    db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    db.verificationToken.delete({ where: { token: hashedToken } }),
  ])
}

export const EMAIL_VERIFICATION_TTL_MINUTES = TOKEN_TTL_MS / 60 / 1000

export async function isEmailVerified(email: string, db: PrismaClient): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  })

  return Boolean(user?.emailVerified)
}
