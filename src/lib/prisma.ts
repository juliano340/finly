import { Prisma as PostgresPrisma, PrismaClient as PrismaPostgresClient } from "@/generated/prisma/client"
import { Prisma as SqlitePrisma, PrismaClient as PrismaSqliteClient } from "@/generated/prisma-sqlite/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaPg } from "@prisma/adapter-pg"

type AppPrismaClient = PrismaPostgresClient

for (const Decimal of [PostgresPrisma.Decimal, SqlitePrisma.Decimal]) {
  Object.defineProperty(Decimal.prototype, "toJSON", {
    configurable: true,
    value(this: { toNumber(): number }) {
      return this.toNumber()
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined
}

function createPrismaClient(): AppPrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db"
  const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://")

  if (isPostgres) {
    return new PrismaPostgresClient({
      adapter: new PrismaPg({
          connectionString: url,
          max: Number(process.env.DATABASE_POOL_MAX ?? 1),
          idleTimeoutMillis: 10_000,
          connectionTimeoutMillis: 10_000,
        }),
    })
  }

  return new PrismaSqliteClient({
    adapter: new PrismaBetterSqlite3({ url }),
  }) as unknown as AppPrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
