// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  return {
    auth: vi.fn(),
    changePassword: vi.fn(),
    setInitialPassword: vi.fn(),
    consumeIpRateLimit: vi.fn(),
    userFindUnique,
    prisma: { user: { findUnique: userFindUnique } },
  }
})

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/features/auth/auth.service", () => ({
  changePassword: mocks.changePassword,
  setInitialPassword: mocks.setInitialPassword,
}))
vi.mock("@/features/auth/request-rate-limit.service", () => ({
  consumeIpRateLimit: mocks.consumeIpRateLimit,
}))

import { POST } from "./route"

const session = { user: { id: "session-user" } }
const body = { currentPassword: "SenhaAntiga123", newPassword: "SenhaNova123" }

function makeRequest(payload: unknown = body) {
  return new Request("http://localhost/api/me/password", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

describe("/api/me/password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue(session)
    mocks.consumeIpRateLimit.mockResolvedValue(false)
    mocks.userFindUnique.mockResolvedValue({ passwordHash: "$2b$12$abc" })
  })

  it("retorna 401 sem sessão", async () => {
    mocks.auth.mockResolvedValue(null)
    const response = await POST(makeRequest())
    expect(response.status).toBe(401)
  })

  it("retorna 429 ao exceder o rate limit", async () => {
    mocks.consumeIpRateLimit.mockResolvedValue(true)
    const response = await POST(makeRequest())
    expect(response.status).toBe(429)
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it("altera a senha e retorna mensagem de sucesso", async () => {
    mocks.changePassword.mockResolvedValue({ ok: true })
    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    expect(mocks.changePassword).toHaveBeenCalledWith("session-user", body, mocks.prisma)
    const data = await response.json()
    expect(data.message).toBe("Senha alterada com sucesso.")
  })

  it("retorna 400 quando a service rejeita (senha atual incorreta)", async () => {
    mocks.changePassword.mockResolvedValue({ error: "Senha atual incorreta" })
    const response = await POST(makeRequest())
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe("Senha atual incorreta")
  })

  it("define senha inicial para conta sem senha (Google-only)", async () => {
    mocks.userFindUnique.mockResolvedValue({ passwordHash: null })
    mocks.setInitialPassword.mockResolvedValue({ ok: true })
    const response = await POST(makeRequest({ newPassword: "SenhaNova123" }))
    expect(response.status).toBe(200)
    expect(mocks.setInitialPassword).toHaveBeenCalledWith(
      "session-user",
      { newPassword: "SenhaNova123" },
      mocks.prisma
    )
    expect(mocks.changePassword).not.toHaveBeenCalled()
    const data = await response.json()
    expect(data.message).toBe("Senha definida com sucesso.")
  })
})
