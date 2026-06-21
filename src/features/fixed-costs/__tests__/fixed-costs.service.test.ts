// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createFixedCost, updateFixedCost } from "../fixed-costs.service"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"

const prisma = getTestClient()

describe("fixed-costs.service - update amount propagation", () => {
  let userId = ""
  let categoryId = ""
  let bankAccountId = ""
  const month = new Date().toISOString().slice(0, 7)
  const uniqueName = () => `CustoTeste${Date.now()}-${Math.random()}`

  beforeAll(async () => {
    const result = await registerUser(
      { name: "FC Test", email: `fc-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""

    const category = await prisma.category.create({
      data: { name: `CatFC${Date.now()}`, userId, type: "EXPENSE" },
    })
    categoryId = category.id

    const account = await prisma.bankAccount.create({
      data: { name: `ContaFC${Date.now()}`, userId, type: "CHECKING" },
    })
    bankAccountId = account.id

    await ensureFinancialMonth(userId, month, prisma)
  })

  afterAll(async () => {
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.bankAccount.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it("atualiza amount de todas ocorrências PENDING (todos os meses) quando defaultAmount muda", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "DEBIT",
      dueDay: 10,
      paidInsideCard: false,
      bankAccountId,
      active: true,
      startDate: "2099-01-01",
      frequency: "MONTHLY",
      endType: "NONE",
    }, prisma)
    expect(created).not.toBeNull()
    if (!created) return

    // Create occurrences for multiple months
    const financialMonth = await ensureFinancialMonth(userId, month, prisma)
    const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)
    const financialMonthPrev = await ensureFinancialMonth(userId, prevMonth, prisma)
    
    await prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: created.id,
        financialMonthId: financialMonth.id,
        month,
        amount: created.defaultAmount,
        userId,
      },
    })
    await prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: created.id,
        financialMonthId: financialMonthPrev.id,
        month: prevMonth,
        amount: created.defaultAmount,
        userId,
      },
    })

    // Update defaultAmount
    const updated = await updateFixedCost(created.id, userId, {
      defaultAmount: 250,
    }, prisma)
    expect(updated).not.toBeNull()
    expect(updated?.defaultAmount).toBe(250)

    // Verify ALL PENDING occurrences were updated
    const occs = await prisma.fixedCostOccurrence.findMany({
      where: { fixedCostId: created.id, userId },
    })
    expect(occs).toHaveLength(2)
    expect(occs.every(o => o.amount === 250)).toBe(true)
  })

  it("NÃO altera ocorrências PAID (já foram pagas com o valor antigo)", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 50,
      categoryId,
      paymentMethod: "DEBIT",
      dueDay: 10,
      paidInsideCard: false,
      bankAccountId,
      active: true,
      startDate: "2099-01-01",
      frequency: "MONTHLY",
      endType: "NONE",
    }, prisma)
    expect(created).not.toBeNull()
    if (!created) return

    const financialMonth = await ensureFinancialMonth(userId, month, prisma)
    await prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: created.id,
        financialMonthId: financialMonth.id,
        month,
        amount: 50,
        status: "PAID",
        paidAt: new Date(),
        userId,
      },
    })

    // Update defaultAmount
    await updateFixedCost(created.id, userId, {
      defaultAmount: 999,
    }, prisma)

    // PAID occurrence should keep old amount
    const occ = await prisma.fixedCostOccurrence.findFirst({
      where: { fixedCostId: created.id, month, userId },
    })
    expect(occ?.amount).toBe(50)
    expect(occ?.status).toBe("PAID")
  })
})
