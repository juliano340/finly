import { PrismaClient } from "@/generated/prisma"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

let testClient: PrismaClient | null = null

export function getTestClient(): PrismaClient {
  if (!testClient) {
    testClient = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: "file:./test.db" }),
    })
  }
  return testClient
}

export async function disconnectTestClient() {
  if (testClient) {
    await testClient.$disconnect()
    testClient = null
  }
}
