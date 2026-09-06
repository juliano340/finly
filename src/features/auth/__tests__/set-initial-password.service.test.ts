// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { compare } from "bcryptjs"
import { getTestClient } from "@/__tests__/prisma"
import { setInitialPassword } from "../auth.service"

const prisma = getTestClient()

describe("setInitialPassword", () => {
  let userId = ""

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `initial-password-${Date.now()}@test.com`, emailVerified: new Date() },
    })
    userId = user.id
  })

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } })
  })

  it("recusa senha curta", async () => {
    const result = await setInitialPassword(userId, { newPassword: "curta" }, prisma)
    expect("error" in result).toBe(true)
  })

  it("define a senha sem invalidar a sessão atual", async () => {
    const before = new Date()
    const result = await setInitialPassword(userId, { newPassword: "SenhaNova123" }, prisma)

    expect("ok" in result).toBe(true)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(await compare("SenhaNova123", user!.passwordHash!)).toBe(true)
    expect(user!.passwordChangedAt).toBeNull()
    expect(user!.passwordChangedAt?.getTime()).toBeUndefined()
    expect(before.getTime()).toBeGreaterThan(0)
  })

  it("recusa usuário que já possui senha", async () => {
    const result = await setInitialPassword(userId, { newPassword: "OutraSenha123" }, prisma)
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("Este usuário já possui senha")
  })
})
