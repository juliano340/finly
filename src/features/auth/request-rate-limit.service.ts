import { createHash } from "node:crypto"
import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"

export interface IpRateLimitOptions {
  max: number
  windowMs: number
}

function clientAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip")?.trim() || null
}

export async function consumeIpRateLimit(
  request: Request,
  scope: string,
  { max, windowMs }: IpRateLimitOptions,
  client?: PrismaClient,
  now = new Date(),
): Promise<boolean> {
  const db = client ?? defaultPrisma
  const address = clientAddress(request)
  if (!address) return false

  const key = `${scope}:${createHash("sha256").update(address).digest("hex")}`
  const windowCutoff = new Date(now.getTime() - windowMs)

  await db.loginAttempt.updateMany({
    where: { key, windowStartedAt: { lte: windowCutoff } },
    data: { failedAttempts: 0, windowStartedAt: now },
  })

  const attempt = await db.loginAttempt.upsert({
    where: { key },
    create: { key, failedAttempts: 1, windowStartedAt: now },
    update: { failedAttempts: { increment: 1 } },
  })

  return attempt.failedAttempts > max
}
