// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { compare } from "bcryptjs"
import { getTestClient } from "@/__tests__/prisma"
import { changePassword, registerUser } from "../auth.service"

const prisma = getTestClient()

describe("changePassword", () => {
  let userId = ""
  let email = ""

  beforeAll(async () => {
    email = `change-password-${Date.now()}@test.com`
    const result = await registerUser(
      { name: "Change Password", email, password: "SenhaAntiga123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
  })

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } })
  })

  it("rejeita senha atual incorreta", async () => {
    const result = await changePassword(userId, {
      currentPassword: "Errada999",
      newPassword: "SenhaNova123",
    }, prisma)

    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("Senha atual incorreta")
  })

  it("rejeita senha nova com menos de 8 caracteres", async () => {
    const result = await changePassword(userId, {
      currentPassword: "SenhaAntiga123",
      newPassword: "curta",
    }, prisma)

    expect("error" in result).toBe(true)
  })

  it("altera a senha e registra passwordChangedAt", async () => {
    const before = new Date()
    const result = await changePassword(userId, {
      currentPassword: "SenhaAntiga123",
      newPassword: "SenhaNova123",
    }, prisma)

    expect("ok" in result).toBe(true)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(await compare("SenhaAntiga123", user!.passwordHash!)).toBe(false)
    expect(await compare("SenhaNova123", user!.passwordHash!)).toBe(true)
    expect(user!.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
  })
})
