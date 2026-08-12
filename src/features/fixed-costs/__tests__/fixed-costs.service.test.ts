// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createFixedCost, resetExpenseFixedCosts, updateFixedCost } from "../fixed-costs.service"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"

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

  it("atualiza ocorrências pendentes atuais/futuras sem reescrever histórico", async () => {
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
      startDate: `${month}-01`,
      frequency: "MONTHLY",
      endType: "NONE",
    }, prisma)
    expect(created).not.toBeNull()
    if (!created) return

    // Create occurrence for previous month (createFixedCost already created current month's)
    const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)
    const financialMonthPrev = await ensureFinancialMonth(userId, prevMonth, prisma)
    
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

    // Preserva histórico e atualiza somente mês atual/futuro ainda aberto.
    const occs = await prisma.fixedCostOccurrence.findMany({
      where: { fixedCostId: created.id, userId },
    })
    expect(occs).toHaveLength(2)
    expect(occs.find((occurrence) => occurrence.month === prevMonth)?.amount.toNumber()).toBe(100)
    expect(occs.find((occurrence) => occurrence.month === month)?.amount.toNumber()).toBe(250)
  })

  it("NÃO altera ocorrências PAID (já foram pagas com o valor antigo)", async () => {
    const name = uniqueName()
    const financialMonth = await ensureFinancialMonth(userId, month, prisma)
    const created = await prisma.fixedCost.create({
      data: {
        name,
        type: "EXPENSE",
        defaultAmount: 50,
        categoryId,
        paymentMethod: "DEBIT",
        dueDay: 10,
        paidInsideCard: false,
        bankAccountId,
        active: true,
        startDate: new Date("2099-01-01"),
        frequency: "MONTHLY",
        endType: "NONE",
        userId,
      },
    })

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
    expect(occ?.amount.toNumber()).toBe(50)
    expect(occ?.status).toBe("PAID")
  })

  it("gera ocorrência de lançamento sem data de fim ao consultar mês futuro", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 88.77,
      categoryId,
      paymentMethod: "DEBIT",
      dueDay: 10,
      paidInsideCard: false,
      bankAccountId,
      active: true,
      startDate: `${month}-01`,
      frequency: "MONTHLY",
      endType: "NONE",
    }, prisma)
    expect(created).not.toBeNull()
    if (!created) return

    const [year, monthNumber] = month.split("-").map(Number)
    const futureDate = new Date(year, monthNumber + 3, 1)
    const futureMonth = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`
    const financialMonth = await ensureFinancialMonth(userId, futureMonth, prisma)

    await ensureFixedCostOccurrences(userId, futureMonth, financialMonth.id, prisma)

    const occurrence = await prisma.fixedCostOccurrence.findFirst({
      where: { fixedCostId: created.id, month: futureMonth, userId, deletedAt: null },
    })
    expect(occurrence?.amount.toNumber()).toBe(88.77)
    expect(occurrence?.dueDate?.toISOString().slice(0, 10)).toBe(`${futureMonth}-10`)
  })

  it("zera apenas despesas fixas do usuário e preserva receitas, outros usuários e movimentos", async () => {
    const other = await registerUser(
      { name: "Other FC Test", email: `fc-other-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    const otherUserId = ("user" in other ? other.user : null)?.id ?? ""
    const otherCategory = await prisma.category.create({
      data: { name: `OtherCatFC${Date.now()}`, userId: otherUserId, type: "EXPENSE" },
    })
    const otherAccount = await prisma.bankAccount.create({
      data: { name: `OtherContaFC${Date.now()}`, userId: otherUserId, type: "CHECKING" },
    })

    try {
      const financialMonth = await ensureFinancialMonth(userId, month, prisma)
      const otherFinancialMonth = await ensureFinancialMonth(otherUserId, month, prisma)
      const expense = await prisma.fixedCost.create({
        data: {
          name: uniqueName(),
          type: "EXPENSE",
          defaultAmount: 100,
          categoryId,
          paymentMethod: "DEBIT",
          dueDay: 10,
          paidInsideCard: false,
          bankAccountId,
          active: true,
          startDate: new Date(`${month}-01T12:00:00`),
          frequency: "MONTHLY",
          endType: "NONE",
          userId,
        },
      })
      const income = await prisma.fixedCost.create({
        data: {
          name: uniqueName(),
          type: "INCOME",
          defaultAmount: 200,
          categoryId,
          paymentMethod: "PIX",
          active: true,
          startDate: new Date(`${month}-01T12:00:00`),
          frequency: "MONTHLY",
          endType: "NONE",
          userId,
        },
      })
      const otherExpense = await prisma.fixedCost.create({
        data: {
          name: uniqueName(),
          type: "EXPENSE",
          defaultAmount: 300,
          categoryId: otherCategory.id,
          paymentMethod: "DEBIT",
          paidInsideCard: false,
          bankAccountId: otherAccount.id,
          active: true,
          startDate: new Date(`${month}-01T12:00:00`),
          frequency: "MONTHLY",
          endType: "NONE",
          userId: otherUserId,
        },
      })

      await prisma.fixedCostOccurrence.createMany({
        data: [
          { fixedCostId: expense.id, financialMonthId: financialMonth.id, month, amount: 100, userId },
          { fixedCostId: income.id, financialMonthId: financialMonth.id, month, amount: 200, userId },
          { fixedCostId: otherExpense.id, financialMonthId: otherFinancialMonth.id, month, amount: 300, userId: otherUserId },
        ],
      })
      const movement = await prisma.bankAccountMovement.create({
        data: {
          bankAccountId,
          amount: 100,
          type: "EXPENSE",
          description: `PAGAMENTO ${expense.name}`,
          userId,
        },
      })

      const result = await resetExpenseFixedCosts(userId, prisma)

      expect(result.fixedCostsDeleted).toBeGreaterThanOrEqual(1)
      expect(result.occurrencesDeleted).toBeGreaterThanOrEqual(1)
      await expect(prisma.fixedCost.findUnique({ where: { id: expense.id } })).resolves.toBeNull()
      await expect(prisma.fixedCostOccurrence.findFirst({ where: { fixedCostId: expense.id, userId } })).resolves.toBeNull()
      await expect(prisma.fixedCost.findUnique({ where: { id: income.id } })).resolves.not.toBeNull()
      await expect(prisma.fixedCostOccurrence.findFirst({ where: { fixedCostId: income.id, userId } })).resolves.not.toBeNull()
      await expect(prisma.fixedCost.findUnique({ where: { id: otherExpense.id } })).resolves.not.toBeNull()
      await expect(prisma.bankAccountMovement.findUnique({ where: { id: movement.id } })).resolves.not.toBeNull()
    } finally {
      await prisma.fixedCostOccurrence.deleteMany({ where: { userId: otherUserId } })
      await prisma.fixedCost.deleteMany({ where: { userId: otherUserId } })
      await prisma.financialMonth.deleteMany({ where: { userId: otherUserId } })
      await prisma.bankAccount.deleteMany({ where: { userId: otherUserId } })
      await prisma.category.deleteMany({ where: { userId: otherUserId } })
      if (otherUserId) await prisma.user.delete({ where: { id: otherUserId } })
    }
  })
})
