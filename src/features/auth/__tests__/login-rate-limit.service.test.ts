// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import {
  clearLoginFailures,
  isLoginBlocked,
  loginRateLimitKeys,
  recordLoginFailure,
} from "@/features/auth/login-rate-limit.service"

const testPrisma = getTestClient()
const request = new Request("http://localhost/api/auth", {
  headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
})

describe("login rate limit", () => {
  afterEach(async () => {
    await testPrisma.loginAttempt.deleteMany({})
  })

  it("não armazena email ou IP nas chaves", () => {
    const keys = loginRateLimitKeys("Pessoa@Example.com", request)
    expect(keys).toHaveLength(2)
    expect(keys.join(" ")).not.toContain("pessoa@example.com")
    expect(keys.join(" ")).not.toContain("203.0.113.10")
  })

  it("bloqueia após cinco falhas persistidas", async () => {
    const keys = loginRateLimitKeys("pessoa@example.com", request)
    const now = new Date("2026-08-09T12:00:00.000Z")

    for (let count = 0; count < 5; count += 1) {
      await recordLoginFailure(keys, testPrisma, now)
    }

    await expect(isLoginBlocked(keys, testPrisma, now)).resolves.toBe(true)
  })

  it("limpa falhas depois de autenticação válida", async () => {
    const keys = loginRateLimitKeys("pessoa@example.com", request)
    await recordLoginFailure(keys, testPrisma)
    await clearLoginFailures(keys, testPrisma)

    await expect(isLoginBlocked(keys, testPrisma)).resolves.toBe(false)
    await expect(testPrisma.loginAttempt.count()).resolves.toBe(0)
  })

  it("reinicia a contagem após a janela expirar", async () => {
    const keys = loginRateLimitKeys("pessoa@example.com", request)
    const firstWindow = new Date("2026-08-09T12:00:00.000Z")
    const nextWindow = new Date("2026-08-09T12:16:00.000Z")

    for (let count = 0; count < 4; count += 1) {
      await recordLoginFailure(keys, testPrisma, firstWindow)
    }
    await recordLoginFailure(keys, testPrisma, nextWindow)

    await expect(isLoginBlocked(keys, testPrisma, nextWindow)).resolves.toBe(false)
  })
})
