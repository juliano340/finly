import { describe, it, expect } from "vitest"
import { PLANS, canPerformAction, getUserPlan } from "../billing.service"

describe("Billing Service", () => {
  it("retorna plano free para todos os usuários", async () => {
    const plan = await getUserPlan("any-user-id")
    expect(plan.planId).toBe("free")
    expect(plan.status).toBe("active")
  })

  it("tem planos free e pro definidos", () => {
    expect(PLANS.free).toBeDefined()
    expect(PLANS.pro).toBeDefined()
    expect(PLANS.free.price).toBe(0)
    expect(PLANS.pro.price).toBe(29.9)
  })

  it("free tem limites corretos", () => {
    expect(PLANS.free.limits.transactions).toBe(50)
    expect(PLANS.free.limits.categories).toBe(10)
    expect(PLANS.free.limits.budgets).toBe(3)
  })

  it("pro tem limites ilimitados", () => {
    expect(PLANS.pro.limits.transactions).toBe(Infinity)
    expect(PLANS.pro.limits.categories).toBe(Infinity)
    expect(PLANS.pro.limits.budgets).toBe(Infinity)
  })

  it("canPerformAction permite quando abaixo do limite", () => {
    const plan = { planId: "free", status: "active" as const, currentPeriodEnd: null }
    expect(canPerformAction(plan, "transactions", 10)).toBe(true)
    expect(canPerformAction(plan, "categories", 5)).toBe(true)
    expect(canPerformAction(plan, "budgets", 1)).toBe(true)
  })

  it("canPerformAction bloqueia quando no limite", () => {
    const plan = { planId: "free", status: "active" as const, currentPeriodEnd: null }
    expect(canPerformAction(plan, "transactions", 50)).toBe(false)
    expect(canPerformAction(plan, "categories", 10)).toBe(false)
    expect(canPerformAction(plan, "budgets", 3)).toBe(false)
  })

  it("pro permite qualquer quantidade", () => {
    const plan = { planId: "pro", status: "active" as const, currentPeriodEnd: null }
    expect(canPerformAction(plan, "transactions", 1000)).toBe(true)
    expect(canPerformAction(plan, "categories", 100)).toBe(true)
    expect(canPerformAction(plan, "budgets", 50)).toBe(true)
  })

  it("free features são uma subset de pro", () => {
    const freeFeatures = PLANS.free.features
    const proFeatures = PLANS.pro.features
    expect(proFeatures.length).toBeGreaterThan(freeFeatures.length)
  })
})
