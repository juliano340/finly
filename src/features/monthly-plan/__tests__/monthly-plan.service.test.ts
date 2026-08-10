// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import {
  getMonthlyPlan,
  MonthlyPlanMonthError,
  updateMonthlyPlan,
} from "../monthly-plan.service"

const prisma = getTestClient()
const MONTH = "2026-08"
const AS_OF = new Date("2026-08-12T15:00:00Z")
const userId = "monthly_plan_service_user"
const otherUserId = "monthly_plan_service_other"

describe("monthly-plan.service", () => {
  beforeAll(async () => {
    await cleanup()
    await prisma.user.createMany({
      data: [
        { id: userId, email: "monthly-plan-service@test.com" },
        { id: otherUserId, email: "monthly-plan-service-other@test.com" },
      ],
    })

    const [expenseCategory, incomeCategory, otherCategory] = await Promise.all([
      prisma.category.create({ data: { name: "Despesa mensal", type: "EXPENSE", userId } }),
      prisma.category.create({ data: { name: "Receita mensal", type: "INCOME", userId } }),
      prisma.category.create({ data: { name: "Outro usuário", type: "EXPENSE", userId: otherUserId } }),
    ])
    const [financialMonth, otherFinancialMonth] = await Promise.all([
      prisma.financialMonth.create({ data: { month: MONTH, userId } }),
      prisma.financialMonth.create({ data: { month: MONTH, userId: otherUserId } }),
    ])
    const card = await prisma.card.create({ data: { name: "Cartão mensal", userId } })
    const otherCard = await prisma.card.create({ data: { name: "Cartão outro", userId: otherUserId } })

    const [income, outsideCard, insideCard] = await Promise.all([
      prisma.fixedCost.create({
        data: {
          name: "Receita recorrente",
          type: "INCOME",
          defaultAmount: 1500,
          categoryId: incomeCategory.id,
          paymentMethod: "PIX",
          userId,
        },
      }),
      prisma.fixedCost.create({
        data: {
          name: "Internet",
          defaultAmount: 120,
          categoryId: expenseCategory.id,
          paymentMethod: "PIX",
          userId,
        },
      }),
      prisma.fixedCost.create({
        data: {
          name: "Streaming no cartão",
          defaultAmount: 50,
          categoryId: expenseCategory.id,
          paymentMethod: "CREDIT_CARD",
          paidInsideCard: true,
          cardId: card.id,
          userId,
        },
      }),
    ])

    await prisma.fixedCostOccurrence.createMany({
      data: [
        { fixedCostId: income.id, financialMonthId: financialMonth.id, month: MONTH, amount: 1500, dueDate: new Date("2026-08-05T15:00:00Z"), userId },
        { fixedCostId: outsideCard.id, financialMonthId: financialMonth.id, month: MONTH, amount: 120, dueDate: new Date("2026-08-10T15:00:00Z"), userId },
        { fixedCostId: insideCard.id, financialMonthId: financialMonth.id, month: MONTH, amount: 50, dueDate: new Date("2026-08-10T15:00:00Z"), userId },
      ],
    })
    await prisma.cardInvoice.createMany({
      data: [
        { cardId: card.id, financialMonthId: financialMonth.id, month: MONTH, dueDate: new Date("2026-08-15T15:00:00Z"), amount: 800, userId },
        { cardId: otherCard.id, financialMonthId: otherFinancialMonth.id, month: MONTH, dueDate: new Date("2026-08-15T15:00:00Z"), amount: 9999, userId: otherUserId },
      ],
    })
    await prisma.transaction.createMany({
      data: [
        { amount: 444, type: "EXPENSE", date: new Date("2026-08-01T02:59:59Z"), categoryId: expenseCategory.id, userId },
        { amount: 4, type: "EXPENSE", date: new Date("2026-08-01T03:00:00Z"), categoryId: expenseCategory.id, userId },
        { amount: 30, type: "EXPENSE", date: new Date("2026-08-05T15:00:00Z"), categoryId: expenseCategory.id, userId },
        { amount: 5, type: "EXPENSE", date: new Date("2026-08-13T02:59:59Z"), categoryId: expenseCategory.id, userId },
        { amount: 999, type: "EXPENSE", date: new Date("2026-08-13T03:00:00Z"), categoryId: expenseCategory.id, userId },
        { amount: 777, type: "INCOME", date: new Date("2026-08-05T15:00:00Z"), categoryId: incomeCategory.id, userId },
        { amount: 9999, type: "EXPENSE", date: new Date("2026-08-05T15:00:00Z"), categoryId: otherCategory.id, userId: otherUserId },
      ],
    })

    const bankAccount = await prisma.bankAccount.create({
      data: { name: "Conta mensal", userId },
    })
    await prisma.bankAccountMovement.create({
      data: { bankAccountId: bankAccount.id, amount: 888, type: "EXPENSE", date: new Date("2026-08-05T15:00:00Z"), userId },
    })
    const importSession = await prisma.importSession.create({
      data: { fileName: "fatura.pdf", rawText: "teste", userId },
    })
    await prisma.importedTransaction.create({
      data: { importSessionId: importSession.id, description: "Compra importada", amount: 666, rawLine: "linha", userId },
    })
  })

  afterAll(cleanup)

  it("compõe receita recorrente, compromissos sem dupla contagem e somente despesas avulsas", async () => {
    const result = await getMonthlyPlan(userId, MONTH, AS_OF, prisma)

    expect(result).toMatchObject({
      incomeOverride: null,
      suggestedIncome: 1500,
      plannedIncome: 1500,
      incomeSource: "SUGGESTED",
      committedExpenses: 920,
      variableSpent: 39,
      plannedBalance: 580,
      projectedSavings: 541,
      variableAvailable: 541,
      daysRemaining: 20,
      dailySafeLimit: 27.05,
    })
  })

  it("recalcula derivados após nova transação sem persistir projeções", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { userId, type: "EXPENSE" } })
    const before = await getMonthlyPlan(userId, MONTH, AS_OF, prisma)
    const transaction = await prisma.transaction.create({
      data: { amount: 10, type: "EXPENSE", date: new Date("2026-08-12T18:00:00Z"), categoryId: category.id, userId },
    })

    const after = await getMonthlyPlan(userId, MONTH, AS_OF, prisma)
    expect(after.variableSpent).toBe(before.variableSpent + 10)
    expect(after.dailySafeLimit).toBe(before.dailySafeLimit - 0.5)

    await prisma.transaction.delete({ where: { id: transaction.id } })
    const stored = await prisma.monthlyPlan.findUnique({ where: { month_userId: { month: MONTH, userId } } })
    expect(stored).toBeNull()
  })

  it("upsert usa usuário+mês e preserva override zero", async () => {
    const updated = await updateMonthlyPlan(
      userId,
      MONTH,
      { incomeOverride: 0, savingsGoal: 300, safetyMargin: 50 },
      AS_OF,
      prisma,
    )

    expect(updated).toMatchObject({
      incomeOverride: 0,
      suggestedIncome: 1500,
      plannedIncome: 0,
      incomeSource: "OVERRIDE",
      savingsGoal: 300,
      safetyMargin: 50,
    })
    await updateMonthlyPlan(userId, MONTH, { incomeOverride: null, savingsGoal: 200, safetyMargin: 25 }, AS_OF, prisma)
    await expect(prisma.monthlyPlan.count({ where: { userId, month: MONTH } })).resolves.toBe(1)
  })

  it("isola leitura e escrita entre usuários e meses", async () => {
    await updateMonthlyPlan(otherUserId, MONTH, { incomeOverride: 9999, savingsGoal: 9999, safetyMargin: 9999 }, AS_OF, prisma)
    const own = await getMonthlyPlan(userId, MONTH, AS_OF, prisma)
    const nextMonth = await getMonthlyPlan(userId, "2026-09", AS_OF, prisma)

    expect(own.incomeOverride).toBeNull()
    expect(own.savingsGoal).toBe(200)
    expect(nextMonth.incomeOverride).toBeNull()
    expect(nextMonth.savingsGoal).toBe(0)
  })

  it("rejeita mês fora da janela antes de materializar recorrências", async () => {
    await expect(getMonthlyPlan(userId, "2028-01", AS_OF, prisma)).rejects.toBeInstanceOf(MonthlyPlanMonthError)
    await expect(prisma.financialMonth.findFirst({ where: { userId, month: "2028-01" } })).resolves.toBeNull()
  })

  it("mantém materialização idempotente em leituras concorrentes", async () => {
    const [first, second] = await Promise.all([
      getMonthlyPlan(userId, MONTH, AS_OF, prisma),
      getMonthlyPlan(userId, MONTH, AS_OF, prisma),
    ])

    expect(first).toEqual(second)
    await expect(prisma.financialMonth.count({ where: { userId, month: MONTH } })).resolves.toBe(1)
  })
})

async function cleanup() {
  const users = [userId, otherUserId]
  await prisma.descriptionMapping.deleteMany({ where: { userId: { in: users } } })
  await prisma.importedTransaction.deleteMany({ where: { userId: { in: users } } })
  await prisma.importSession.deleteMany({ where: { userId: { in: users } } })
  await prisma.bankAccountMovement.deleteMany({ where: { userId: { in: users } } })
  await prisma.monthlyPlan.deleteMany({ where: { userId: { in: users } } })
  await prisma.fixedCostOccurrence.deleteMany({ where: { userId: { in: users } } })
  await prisma.cardInvoice.deleteMany({ where: { userId: { in: users } } })
  await prisma.fixedCost.deleteMany({ where: { userId: { in: users } } })
  await prisma.transaction.deleteMany({ where: { userId: { in: users } } })
  await prisma.bankAccount.deleteMany({ where: { userId: { in: users } } })
  await prisma.financialMonth.deleteMany({ where: { userId: { in: users } } })
  await prisma.card.deleteMany({ where: { userId: { in: users } } })
  await prisma.category.deleteMany({ where: { userId: { in: users } } })
  await prisma.user.deleteMany({ where: { id: { in: users } } })
}
