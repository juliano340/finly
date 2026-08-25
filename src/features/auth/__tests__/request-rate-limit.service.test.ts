import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { consumeIpRateLimit } from "../request-rate-limit.service"

function makeRequest(ip: string | null): Request {
  const headers = new Headers()
  if (ip) headers.set("x-forwarded-for", `${ip}, 10.0.0.1`)
  return new Request("https://finly.app/api/auth/register", {
    method: "POST",
    headers,
  })
}

function makeClient() {
  return {
    loginAttempt: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn(),
    },
  }
}

const options = { max: 3, windowMs: 60 * 60 * 1000 }

describe("consumeIpRateLimit", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv("NODE_ENV", "production")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("não contabiliza nada fora de produção", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const client = makeClient()
    const limited = await consumeIpRateLimit(makeRequest("1.1.1.1"), "register", options, client as never)
    expect(limited).toBe(false)
    expect(client.loginAttempt.upsert).not.toHaveBeenCalled()
  })

  it("não limita quando não há IP identificável", async () => {
    const client = makeClient()
    const limited = await consumeIpRateLimit(makeRequest(null), "register", options, client as never)
    expect(limited).toBe(false)
    expect(client.loginAttempt.upsert).not.toHaveBeenCalled()
  })

  it.each([
    ["1.2.3.4 via x-forwarded-for", "1.2.3.4"],
    ["5.6.7.8 via x-real-ip", null],
  ])("conta tentativas por IP ($label)", async (_label, forwarded) => {
    const request = forwarded
      ? makeRequest(forwarded)
      : new Request("https://finly.app/x", { headers: { "x-real-ip": "5.6.7.8" } })
    const client = makeClient()

    for (let attempt = 1; attempt <= 4; attempt++) {
      client.loginAttempt.upsert.mockResolvedValueOnce({
        key: "k",
        failedAttempts: attempt,
        windowStartedAt: new Date(),
      })
      const limited = await consumeIpRateLimit(request, "register", options, client as never)
      expect(limited).toBe(attempt > 3)
    }

    expect(client.loginAttempt.upsert).toHaveBeenCalledTimes(4)
  })

  it("reseta o contador quando a janela expirou", async () => {
    const client = makeClient()
    client.loginAttempt.upsert.mockResolvedValue({ failedAttempts: 1, windowStartedAt: new Date() })

    await consumeIpRateLimit(makeRequest("9.9.9.9"), "reset-password", options, client as never)

    expect(client.loginAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ windowStartedAt: expect.anything() }),
        data: expect.objectContaining({ failedAttempts: 0 }),
      })
    )
  })

  it("isola escopos por chave namespaced", async () => {
    const client = makeClient()
    client.loginAttempt.upsert.mockResolvedValue({ failedAttempts: 1, windowStartedAt: new Date() })

    await consumeIpRateLimit(makeRequest("7.7.7.7"), "register", options, client as never)
    await consumeIpRateLimit(makeRequest("7.7.7.7"), "reset-password", options, client as never)

    const keys = client.loginAttempt.upsert.mock.calls.map((call) => call[0].where.key)
    expect(keys[0]).not.toBe(keys[1])
    expect(keys[0]).toMatch(/^register:/)
    expect(keys[1]).toMatch(/^reset-password:/)
  })

  it("não usa o mesmo IP em texto puro como chave", async () => {
    const client = makeClient()
    client.loginAttempt.upsert.mockResolvedValue({ failedAttempts: 1, windowStartedAt: new Date() })

    await consumeIpRateLimit(makeRequest("8.8.8.8"), "register", options, client as never)

    const key = client.loginAttempt.upsert.mock.calls[0][0].where.key
    expect(key).not.toContain("8.8.8.8")
  })
})
