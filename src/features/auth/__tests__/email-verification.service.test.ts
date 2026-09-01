// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import {
  createEmailVerificationToken,
  EmailVerificationRateLimitError,
  EmailVerificationTokenExpiredError,
  EmailVerificationTokenInvalidError,
  verifyEmail,
} from "@/features/auth/email-verification.service"

const testPrisma = getTestClient()
const email = "maria@verify-test.com"

describe("email verification", () => {
  beforeEach(async () => {
    await testPrisma.verificationToken.deleteMany({ where: { identifier: `email-verification:${email}` } })
    await testPrisma.user.upsert({
      where: { email },
      update: { emailVerified: null },
      create: { email, name: "Maria", passwordHash: "hash" },
    })
  })

  afterAll(async () => {
    await testPrisma.verificationToken.deleteMany({ where: { identifier: `email-verification:${email}` } })
    await testPrisma.user.deleteMany({ where: { email } })
  })

  it("cria token opaco para usuário pendente", async () => {
    const token = await createEmailVerificationToken(email, testPrisma)

    expect(token).toBeTruthy()
    const stored = await testPrisma.verificationToken.findFirst({
      where: { identifier: `email-verification:${email}` },
    })
    expect(stored?.token).not.toBe(token)
  })

  it("confirma e-mail e consome token", async () => {
    const token = await createEmailVerificationToken(email, testPrisma)
    await verifyEmail(token!, testPrisma)

    const user = await testPrisma.user.findUnique({ where: { email } })
    const stored = await testPrisma.verificationToken.findFirst({
      where: { identifier: `email-verification:${email}` },
    })
    expect(user?.emailVerified).not.toBeNull()
    expect(stored).toBeNull()
  })

  it("não aceita token usado ou de outro fluxo", async () => {
    await expect(verifyEmail("invalid-token", testPrisma)).rejects.toBeInstanceOf(EmailVerificationTokenInvalidError)
  })

  it("restringe reenvio até o período de espera", async () => {
    await createEmailVerificationToken(email, testPrisma)
    await expect(createEmailVerificationToken(email, testPrisma)).rejects.toBeInstanceOf(EmailVerificationRateLimitError)
  })

  it("rejeita token expirado", async () => {
    const token = await createEmailVerificationToken(email, testPrisma)
    const record = await testPrisma.verificationToken.findFirst({ where: { identifier: `email-verification:${email}` } })
    await testPrisma.verificationToken.update({ where: { token: record!.token }, data: { expires: new Date(Date.now() - 1) } })

    await expect(verifyEmail(token!, testPrisma)).rejects.toBeInstanceOf(EmailVerificationTokenExpiredError)
  })
})
