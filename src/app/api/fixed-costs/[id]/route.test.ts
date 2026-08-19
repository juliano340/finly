// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteFixedCost: vi.fn(),
  updateFixedCostOccurrenceAmount: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("@/features/fixed-costs/fixed-costs.service", () => {
  class ProtectedFixedCostOccurrenceError extends Error {
    constructor(public readonly reason: "PAID" | "CLOSED" | "DELETED") {
      super("Ocorrência protegida")
    }
  }
  class StaleFixedCostOccurrenceError extends Error {}
  return {
    deleteFixedCost: mocks.deleteFixedCost,
    updateFixedCostOccurrenceAmount: mocks.updateFixedCostOccurrenceAmount,
    ProtectedFixedCostOccurrenceError,
    StaleFixedCostOccurrenceError,
  }
})

import { ProtectedFixedCostOccurrenceError } from "@/features/fixed-costs/fixed-costs.service"
import { PUT } from "./route"

const payload = {
  occurrenceId: "occurrence-1",
  month: "2026-11",
  scope: "THIS_MONTH",
  amount: 150,
  expectedUpdatedAt: "2026-11-01T12:00:00.000Z",
}

describe("PUT /api/fixed-costs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } })
  })

  it.each(["PAID", "CLOSED", "DELETED"] as const)("retorna 409 para ocorrência protegida: %s", async (reason) => {
    mocks.updateFixedCostOccurrenceAmount.mockRejectedValue(new ProtectedFixedCostOccurrenceError(reason))

    const response = await PUT(new Request("http://localhost/api/fixed-costs/fixed-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }), { params: Promise.resolve({ id: "fixed-1" }) })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: "Ocorrência protegida",
      conflict: "PROTECTED_OCCURRENCE",
      reason,
    })
    expect(mocks.updateFixedCostOccurrenceAmount).toHaveBeenCalledWith("fixed-1", "user-1", payload)
  })
})
