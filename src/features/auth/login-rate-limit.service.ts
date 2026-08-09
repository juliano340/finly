import { createHash } from "node:crypto"
import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"

const MAX_FAILURES = 5
const MAX_IP_FAILURES = 25
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function clientAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip")?.trim() || null
}

export function loginRateLimitKeys(email: string, request: Request): string[] {
  const keys = [`email:${digest(email.trim().toLowerCase())}`]
  const address = clientAddress(request)
  if (address) keys.push(`ip:${digest(address)}`)
  return keys
}

export async function isLoginBlocked(
  keys: string[],
  client?: PrismaClient,
  now = new Date()
): Promise<boolean> {
  const db = client ?? defaultPrisma
  const blocked = await db.loginAttempt.findFirst({
    where: { key: { in: keys }, lockedUntil: { gt: now } },
    select: { key: true },
  })
  return blocked !== null
}

export async function recordLoginFailure(
  keys: string[],
  client?: PrismaClient,
  now = new Date()
): Promise<void> {
  const db = client ?? defaultPrisma
  const windowCutoff = new Date(now.getTime() - WINDOW_MS)

  await Promise.all(keys.map(async (key) => {
    await db.loginAttempt.updateMany({
      where: { key, windowStartedAt: { lte: windowCutoff } },
      data: { failedAttempts: 0, windowStartedAt: now, lockedUntil: null },
    })

    const attempt = await db.loginAttempt.upsert({
      where: { key },
      create: { key, failedAttempts: 1, windowStartedAt: now },
      update: { failedAttempts: { increment: 1 } },
    })

    const maxFailures = key.startsWith("ip:") ? MAX_IP_FAILURES : MAX_FAILURES
    if (attempt.failedAttempts >= maxFailures) {
      await db.loginAttempt.update({
        where: { key },
        data: { lockedUntil: new Date(now.getTime() + LOCK_MS) },
      })
    }
  }))
}

export async function clearLoginFailures(keys: string[], client?: PrismaClient): Promise<void> {
  const db = client ?? defaultPrisma
  await db.loginAttempt.deleteMany({ where: { key: { in: keys } } })
}
