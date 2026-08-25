// @vitest-environment node
import { describe, it, expect, afterAll, beforeEach } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPassword,
  RateLimitError,
  TokenExpiredError,
  TokenInvalidError,
} from "@/features/auth/password-reset.service"
import { compare } from "bcryptjs"

const testPrisma = getTestClient()

const testEmails: string[] = []

async function createUser(email: string, name = "Test User") {
  await testPrisma.user.create({
    data: { name, email, passwordHash: "$2a$12$oldhashplaceholder" },
  })
  testEmails.push(email)
}

beforeEach(async () => {
  await testPrisma.verificationToken.deleteMany({})
})

afterAll(async () => {
  for (const email of testEmails) {
    await testPrisma.user.deleteMany({ where: { email } })
  }
  testEmails.length = 0
})

describe("password-reset.service", () => {
  it("cria token e armazena hash SHA-256 (nao texto puro)", async () => {
    const email = "u1@test-reset.local"
    await createUser(email)

    const plain = await createPasswordResetToken(email, testPrisma)
    expect(typeof plain).toBe("string")

    const stored = await testPrisma.verificationToken.findUnique({
      where: { token: plain as unknown as string },
    })
    expect(stored).toBeNull() // plain nunca fica no DB

    const records = await testPrisma.verificationToken.findMany({
      where: { identifier: email },
    })
    expect(records).toHaveLength(1)
    const hashedToken = records[0].token
    expect(hashedToken).not.toBe(plain)
    expect(hashedToken).toHaveLength(64) // sha256 hex

    await testPrisma.verificationToken.deleteMany({ where: { identifier: email } })
  })

  it("token expira apos 30min", async () => {
    const email = "u2@test-reset.local"
    await createUser(email)

    const plain = await createPasswordResetToken(email, testPrisma)
    if (!plain) throw new Error("token null inesperado")

    const record = await testPrisma.verificationToken.findFirst({
      where: { identifier: email },
    })
    if (!record) throw new Error("registro nao encontrado")

    await testPrisma.verificationToken.update({
      where: { token: record.token },
      data: { expires: new Date(Date.now() - 1000) },
    })

    await expect(validatePasswordResetToken(plain, testPrisma)).rejects.toBeInstanceOf(
      TokenExpiredError
    )

    // apagado apos expirar
    const after = await testPrisma.verificationToken.findFirst({
      where: { identifier: email },
    })
    expect(after).toBeNull()
  })

  it("token unico-use: deletado apos reset", async () => {
    const email = "u3@test-reset.local"
    await createUser(email)

    const plain = await createPasswordResetToken(email, testPrisma)
    if (!plain) throw new Error("token null")

    await resetPassword(plain, "NovaSenha123", testPrisma)

    const remaining = await testPrisma.verificationToken.findFirst({
      where: { identifier: email },
    })
    expect(remaining).toBeNull()

    // segundo uso falha
    await expect(resetPassword(plain, "OutraSenha456", testPrisma)).rejects.toBeInstanceOf(
      TokenInvalidError
    )
  })

  it("reseta senha com sucesso e atualiza passwordChangedAt", async () => {
    const email = "u4@test-reset.local"
    await createUser(email)

    const plain = await createPasswordResetToken(email, testPrisma)
    if (!plain) throw new Error("token null")

    await resetPassword(plain, "SenhaVaiada789", testPrisma)

    const user = await testPrisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, passwordChangedAt: true },
    })

    expect(user).not.toBeNull()
    expect(await compare("SenhaVaiada789", user!.passwordHash!)).toBe(true)
    expect(user!.passwordChangedAt).not.toBeNull()
  })

  it("rate limit: 2 pedidos em <10min rejeita o segundo", async () => {
    const email = "u5@test-reset.local"
    await createUser(email)

    const first = await createPasswordResetToken(email, testPrisma)
    expect(first).not.toBeNull()

    await expect(createPasswordResetToken(email, testPrisma)).rejects.toBeInstanceOf(
      RateLimitError
    )
  })

  it("tokens antigos invalidados ao gerar novo (apos rate-limit expirar)", async () => {
    const email = "u6@test-reset.local"
    await createUser(email)

    const first = await createPasswordResetToken(email, testPrisma)
    if (!first) throw new Error("first token null")

    const record = await testPrisma.verificationToken.findFirst({
      where: { identifier: email },
    })
    if (!record) throw new Error("nao encontrado")

    // simula rate-limit expirado
    await testPrisma.verificationToken.update({
      where: { token: record.token },
      data: { expires: new Date(Date.now() - 1) },
    })

    const second = await createPasswordResetToken(email, testPrisma)
    expect(second).not.toBeNull()
    expect(second).not.toBe(first)

    // primeiro token foi deletado por deleteMany ao gerar o segundo
    await expect(validatePasswordResetToken(first, testPrisma)).rejects.toBeInstanceOf(
      TokenInvalidError
    )

    // segundo valida
    const emailValid = await validatePasswordResetToken(second!, testPrisma)
    expect(emailValid).toBe(email)
  })

  it("email inexistente retorna null (nao lanca)", async () => {
    const result = await createPasswordResetToken("naoexiste@test-reset.local", testPrisma)
    expect(result).toBeNull()
  })

  it("token invalido lanca TokenInvalidError", async () => {
    await expect(validatePasswordResetToken("token-falso", testPrisma)).rejects.toBeInstanceOf(
      TokenInvalidError
    )
  })
})