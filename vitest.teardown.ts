import { disconnectTestClient } from "./src/__tests__/prisma"

export default async function teardown() {
  await disconnectTestClient()
}
