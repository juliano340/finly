// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getMonthlyPlan: vi.fn(),
  updateMonthlyPlan: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("@/features/monthly-plan/monthly-plan.service", () => ({
  getMonthlyPlan: mocks.getMonthlyPlan,
  updateMonthlyPlan: mocks.updateMonthlyPlan,
}))

import { dynamic, GET, PUT } from "./route"

const projection = { month: "2026-08", dailySafeLimit: 18.25 }

describe("/api/monthly-plan", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-09T15:00:00Z"))
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "session-user" } })
    mocks.getMonthlyPlan.mockResolvedValue(projection)
    mocks.updateMonthlyPlan.mockResolvedValue(projection)
  })

  afterEach(() => vi.useRealTimers())

  it("é dinâmico e impede cache compartilhado", async () => {
    const response = await GET(new Request("http://localhost/api/monthly-plan?month=2026-08"))
    expect(dynamic).toBe("force-dynamic")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })

  it("exige autenticação em GET e PUT", async () => {
    mocks.auth.mockResolvedValue(null)
    const getResponse = await GET(new Request("http://localhost/api/monthly-plan?month=2026-08"))
    const putResponse = await PUT(new Request("http://localhost/api/monthly-plan", {
      method: "PUT",
      body: JSON.stringify({ month: "2026-08", incomeOverride: null, savingsGoal: 0, safetyMargin: 0 }),
    }))
    expect(getResponse.status).toBe(401)
    expect(putResponse.status).toBe(401)
  })

  it("GET deriva tenant somente da sessão", async () => {
    const response = await GET(new Request("http://localhost/api/monthly-plan?month=2026-08&userId=attacker"))
    expect(response.status).toBe(400)
    expect(mocks.getMonthlyPlan).not.toHaveBeenCalled()

    const valid = await GET(new Request("http://localhost/api/monthly-plan?month=2026-08"))
    expect(valid.status).toBe(200)
    expect(mocks.getMonthlyPlan).toHaveBeenCalledWith("session-user", "2026-08", expect.any(Date))
  })

  it("aceita extremos da janela e rejeita meses externos antes do serviço", async () => {
    for (const month of ["2025-01", "2027-12"]) {
      expect((await GET(new Request(`http://localhost/api/monthly-plan?month=${month}`))).status).toBe(200)
    }
    mocks.getMonthlyPlan.mockClear()
    for (const month of ["2024-12", "2028-01", "2026-00", "2026-13"]) {
      expect((await GET(new Request(`http://localhost/api/monthly-plan?month=${month}`))).status).toBe(400)
    }
    expect(mocks.getMonthlyPlan).not.toHaveBeenCalled()
  })

  it("PUT mantém null/zero e bloqueia mass assignment", async () => {
    const body = { month: "2026-08", incomeOverride: 0, savingsGoal: 0, safetyMargin: 0 }
    const valid = await PUT(new Request("http://localhost/api/monthly-plan", {
      method: "PUT",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify(body),
    }))
    expect(valid.status).toBe(200)
    expect(mocks.updateMonthlyPlan).toHaveBeenCalledWith(
      "session-user",
      "2026-08",
      { incomeOverride: 0, savingsGoal: 0, safetyMargin: 0 },
      expect.any(Date),
    )

    const invalid = await PUT(new Request("http://localhost/api/monthly-plan", {
      method: "PUT",
      body: JSON.stringify({ ...body, userId: "attacker", dailySafeLimit: 999 }),
    }))
    expect(invalid.status).toBe(400)
  })

  it("rejeita Origin cruzada quando presente", async () => {
    const response = await PUT(new Request("http://localhost/api/monthly-plan", {
      method: "PUT",
      headers: { origin: "https://evil.example" },
      body: JSON.stringify({ month: "2026-08", incomeOverride: null, savingsGoal: 0, safetyMargin: 0 }),
    }))
    expect(response.status).toBe(403)
    expect(mocks.updateMonthlyPlan).not.toHaveBeenCalled()
  })

  it("não expõe detalhes de falhas internas", async () => {
    mocks.getMonthlyPlan.mockRejectedValue(new Error("database password leaked"))
    const response = await GET(new Request("http://localhost/api/monthly-plan?month=2026-08"))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Erro ao buscar plano mensal" })
  })
})
