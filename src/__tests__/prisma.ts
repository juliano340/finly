import { PrismaClient as PrismaPostgresClient } from "@/generated/prisma/client"
import { PrismaClient as PrismaSqliteClient } from "@/generated/prisma-sqlite/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

type AppPrismaClient = PrismaPostgresClient

let testClient: AppPrismaClient | null = null

export function getTestClient(): AppPrismaClient {
  if (!testClient) {
    testClient = new PrismaSqliteClient({
      adapter: new PrismaBetterSqlite3({ url: "file:./test.db" }),
    }) as unknown as AppPrismaClient
  }
  return testClient
}

export async function disconnectTestClient() {
  if (testClient) {
    await testClient.$disconnect()
    testClient = null
  }
}
