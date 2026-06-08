import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"

export async function ensureFinancialMonth(
  userId: string,
  month: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  return db.financialMonth.upsert({
    where: { month_userId: { month, userId } },
    update: {},
    create: { month, userId },
  })
}
