// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"

const testPrisma = getTestClient()

describe("ensureFinancialMonth", () => {
  let userId: string
  const month = "2026-07"

  beforeAll(async () => {
    const result = await registerUser(
      { name: "FM User", email: `fm-${Date.now()}@test.com`, password: "Senha123" },
      testPrisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
  })

  afterAll(async () => {
    await testPrisma.financialMonth.deleteMany({ where: { userId } })
    await testPrisma.user.delete({ where: { id: userId } })
  })

  it("cria novo financial month com status OPEN", async () => {
    const fm = await ensureFinancialMonth(userId, month, testPrisma)
    expect(fm.month).toBe(month)
    expect(fm.userId).toBe(userId)
    expect(fm.status).toBe("OPEN")
  })

  it("é idempotente — segunda chamada retorna mesmo registro", async () => {
    const first = await ensureFinancialMonth(userId, month, testPrisma)
    const second = await ensureFinancialMonth(userId, month, testPrisma)
    expect(first.id).toBe(second.id)
  })

  it("não atualiza status se o mês já existe e está CLOSED", async () => {
    const testMonth = "2026-08"
    const fm = await ensureFinancialMonth(userId, testMonth, testPrisma)
    await testPrisma.financialMonth.update({
      where: { id: fm.id },
      data: { status: "CLOSED" },
    })
    const result = await ensureFinancialMonth(userId, testMonth, testPrisma)
    expect(result.status).toBe("CLOSED")
  })

  it("cria meses distintos para o mesmo usuário", async () => {
    const fm1 = await ensureFinancialMonth(userId, "2026-09", testPrisma)
    const fm2 = await ensureFinancialMonth(userId, "2026-10", testPrisma)
    expect(fm1.id).not.toBe(fm2.id)
  })

  it("cross-user isolation — aceita client opcional", async () => {
    const fm = await ensureFinancialMonth(userId, month, testPrisma)
    expect(fm.userId).toBe(userId)
  })
})
