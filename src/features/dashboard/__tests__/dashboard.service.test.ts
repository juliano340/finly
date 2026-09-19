// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { createCard } from "@/features/cards/cards.service"
import { createCardInvoice } from "@/features/card-invoices/card-invoices.service"
import { createFixedCost } from "@/features/fixed-costs/fixed-costs.service"
import { getCardInvoiceEvolution, getDashboardStats, getMonthlyEvolution } from "../dashboard.service"

const prisma = getTestClient()

describe("Dashboard Service", () => {
  const userId = "user_dash_test"
  const otherUserId = "user_other_test"
  let expenseCategoryId = ""

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, name: "Dash Tester", email: `dash-${Date.now()}@test.com` },
    })

    const catExpense = await prisma.category.create({
      data: { name: "Alimentação", type: "EXPENSE", color: "#E85D5D", icon: "UtensilsCrossed", userId },
    })
    expenseCategoryId = catExpense.id
    const catIncome = await prisma.category.create({
      data: { name: "Salário", type: "INCOME", color: "#0EA882", icon: "Banknote", userId },
    })

    await prisma.transaction.createMany({
      data: [
        { amount: 5000, type: "INCOME", date: new Date(2026, 5, 1, 12, 0, 0), categoryId: catIncome.id, userId },
        { amount: 150, type: "EXPENSE", date: new Date(2026, 5, 5, 12, 0, 0), categoryId: catExpense.id, userId },
        { amount: 200, type: "EXPENSE", date: new Date(2026, 5, 10, 12, 0, 0), categoryId: catExpense.id, userId },
        { amount: 100, type: "EXPENSE", date: new Date(2026, 5, 15, 12, 0, 0), categoryId: catExpense.id, userId },
      ],
    })

    // Other user data
    await prisma.user.create({
      data: { id: otherUserId, name: "Other", email: `other-${Date.now()}@test.com` },
    })
    const catOther = await prisma.category.create({
      data: { name: "Lazer", type: "EXPENSE", color: "#8B5CF6", icon: "Gamepad2", userId: otherUserId },
    })
    await prisma.transaction.create({
      data: { amount: 9999, type: "EXPENSE", date: new Date(2026, 5, 20, 12, 0, 0), categoryId: catOther.id, userId: otherUserId },
    })
  })

  afterAll(async () => {
    await prisma.cardInvoice.deleteMany({ where: { userId } })
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId: { in: [userId, otherUserId] } } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId: { in: [userId, otherUserId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } })
  })

  it("retorna stats corretas para o mês", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.income).toBe(5000)
    expect(stats.expense).toBe(450)
    expect(stats.balance).toBe(4550)
  })

  it("retorna categorias de despesa agrupadas", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.byCategory).toHaveLength(1)
    expect(stats.byCategory[0].name).toBe("Alimentação")
    expect(stats.byCategory[0].value).toBe(450)
  })

  it("retorna tendência diária", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.dailyTrend.length).toBeGreaterThan(0)
    const hasIncome = stats.dailyTrend.some((d) => d.income > 0)
    const hasExpense = stats.dailyTrend.some((d) => d.expense > 0)
    expect(hasIncome).toBe(true)
    expect(hasExpense).toBe(true)
  })

  it("retorna transações recentes", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.recentTransactions).toHaveLength(4)
    expect(stats.recentTransactions[0].categoryName).toBeDefined()
  })

  it("retorna zeros para mês sem transações", async () => {
    const stats = await getDashboardStats(userId, "2026-01", prisma)

    expect(stats.balance).toBe(0)
    expect(stats.income).toBe(0)
    expect(stats.expense).toBe(0)
    expect(stats.byCategory).toHaveLength(0)
    expect(stats.dailyTrend).toHaveLength(0)
    expect(stats.recentTransactions).toHaveLength(0)
  })

  it("inclui custos fixos e faturas nas receitas e despesas do mês", async () => {
    const card = await createCard(
      userId,
      { name: `Stats ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-06", dueDate: new Date("2026-06-15T12:00:00"), amount: 800, status: "PENDING" },
      prisma
    )
    const incomeCategory = await prisma.category.findFirst({
      where: { userId, type: "INCOME" },
    })
    if (!incomeCategory) return
    const fixedCost = await createFixedCost(
      userId,
      { name: `Salário fixo ${Date.now()}`, type: "INCOME" as const, defaultAmount: 3000, categoryId: incomeCategory.id, paymentMethod: "PIX", dueDay: 5, paidInsideCard: false, cardId: null, bankAccountId: null, active: true, startDate: "2026-01-01", frequency: "MONTHLY", endType: "NONE" },
      prisma
    )
    expect(fixedCost).not.toBeNull()
    if (!fixedCost) return

    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.income).toBe(8000)
    expect(stats.expense).toBe(1250)
    expect(stats.balance).toBe(6750)

    const faturasEntry = stats.byCategory.find((c) => c.name === "Faturas de cartão")
    expect(faturasEntry?.value).toBe(800)
    expect(stats.dailyTrend.some((d) => d.income > 0)).toBe(true)
    expect(stats.recentTransactions.some((tx) => tx.description === fixedCost.name)).toBe(true)
    expect(stats.recentTransactions.some((tx) => tx.description?.startsWith("Fatura "))).toBe(true)

    await prisma.fixedCostOccurrence.deleteMany({ where: { userId, month: "2026-06", fixedCostId: fixedCost.id } })
    await prisma.fixedCost.delete({ where: { id: fixedCost.id } })
    await prisma.cardInvoice.deleteMany({ where: { userId, month: "2026-06", cardId: card.id } })
    await prisma.card.delete({ where: { id: card.id } })
  })

  it("não mistura dados de outros usuários", async () => {
    const stats = await getDashboardStats(userId, "2026-06", prisma)

    expect(stats.expense).toBe(450)
    expect(stats.byCategory).toHaveLength(1)
  })

  it("retorna evolução mensal com faturas, custos fixos e avulsas", async () => {
    const card = await createCard(
      userId,
      { name: `Evolução ${Date.now()}`, brand: "Visa", color: "#22C55E", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(card).not.toBeNull()
    if (!card) return

    await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-06", dueDate: new Date("2026-06-15T12:00:00"), amount: 800, status: "PENDING" },
      prisma
    )
    await createFixedCost(
      userId,
      { name: `Internet evolução ${Date.now()}`, type: "EXPENSE" as const, defaultAmount: 120, categoryId: expenseCategoryId, paymentMethod: "PIX", dueDay: 10, paidInsideCard: false, cardId: null, bankAccountId: null, active: true, startDate: "2026-01-01", frequency: "MONTHLY", endType: "NONE" },
      prisma
    )

    const evolution = await getMonthlyEvolution(userId, "2026-06", 2, prisma)
    const june = evolution.months.find((item) => item.month === "2026-06")

    expect(june?.invoices).toBe(800)
    expect(june?.fixedCosts).toBeGreaterThanOrEqual(120)
    expect(june?.looseExpenses).toBe(450)
    expect(june?.total).toBe((june?.invoices ?? 0) + (june?.fixedCosts ?? 0) + (june?.looseExpenses ?? 0))
  })

  it("retorna evolução de faturas por cartão", async () => {
    const suffix = Date.now()
    const inter = await createCard(
      userId,
      { name: `Inter evolução ${suffix}`, brand: "Mastercard", color: "#f97316", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    const nubank = await createCard(
      userId,
      { name: `Nubank evolução ${suffix}`, brand: "Mastercard", color: "#8b5cf6", closingDay: 5, dueDay: 15, bankAccountId: null },
      prisma
    )
    expect(inter).not.toBeNull()
    expect(nubank).not.toBeNull()
    if (!inter || !nubank) return

    await createCardInvoice(
      userId,
      { cardId: inter.id, month: "2026-04", dueDate: new Date("2026-04-15T12:00:00"), amount: 300, status: "PENDING" },
      prisma
    )
    await createCardInvoice(
      userId,
      { cardId: inter.id, month: "2026-05", dueDate: new Date("2026-05-15T12:00:00"), amount: 500, status: "PENDING" },
      prisma
    )
    await createCardInvoice(
      userId,
      { cardId: nubank.id, month: "2026-05", dueDate: new Date("2026-05-15T12:00:00"), amount: 200, status: "PENDING" },
      prisma
    )

    const evolution = await getCardInvoiceEvolution(userId, "2026-05", 2, prisma)
    const april = evolution.months.find((item) => item.month === "2026-04")
    const may = evolution.months.find((item) => item.month === "2026-05")

    expect(evolution.cards.map((card) => card.id)).toContain(inter.id)
    expect(evolution.cards.map((card) => card.id)).toContain(nubank.id)
    expect(april?.total).toBe(300)
    expect(april?.cards[inter.id]).toBe(300)
    expect(may?.total).toBe(700)
    expect(may?.cards[inter.id]).toBe(500)
    expect(may?.cards[nubank.id]).toBe(200)
  })
})

describe("Dashboard Service — VA (benefício)", () => {
  const userId = `user_benefit_dash_${Date.now()}`
  const multiUserId = `user_benefit_multi_${Date.now()}`
  const month = "2026-10"
  const estimatedMonth = "2026-11"
  const multiMonth = "2026-12"
  let benefitAccountId = ""

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, name: "Benefit Dash", email: `benefit-dash-${Date.now()}@test.com` },
    })
    const expenseCategory = await prisma.category.create({
      data: { name: "Mercado VA", type: "EXPENSE", color: "#22C55E", icon: "ShoppingCart", userId },
    })
    const incomeCategory = await prisma.category.create({
      data: { name: "Salário VA", type: "INCOME", color: "#0EA882", icon: "Banknote", userId },
    })

    const account = await prisma.bankAccount.create({
      data: { name: `VA ${Date.now()}`, type: "BENEFIT", benefitDailyRate: 22, userId },
    })
    benefitAccountId = account.id
    await prisma.bankAccountMovement.createMany({
      data: [
        { bankAccountId: account.id, amount: 500, type: "INCOME", description: "RECARGA BENEFÍCIO: OUTUBRO", date: new Date("2026-10-01T12:00:00"), userId },
        { bankAccountId: account.id, amount: 120.5, type: "EXPENSE", description: "Mercado do mês", date: new Date("2026-10-05T12:00:00"), userId },
        { bankAccountId: account.id, amount: 80.3, type: "EXPENSE", description: "Lanchonete", date: new Date("2026-10-10T12:00:00"), userId },
      ],
    })

    await prisma.transaction.create({
      data: { amount: 999, type: "INCOME", categoryId: incomeCategory.id, bankAccountId: account.id, userId, date: new Date("2026-10-01T12:00:00") },
    })
    await prisma.transaction.create({
      data: { amount: 5000, type: "INCOME", categoryId: incomeCategory.id, userId, date: new Date("2026-10-02T12:00:00") },
    })
    await prisma.transaction.create({
      data: { amount: 100, type: "EXPENSE", categoryId: expenseCategory.id, userId, date: new Date("2026-10-03T12:00:00") },
    })

    await prisma.user.create({
      data: { id: multiUserId, name: "Benefit Multi", email: `benefit-multi-${Date.now()}@test.com` },
    })
    const multiAccount = await prisma.bankAccount.create({
      data: { name: `VA multi ${Date.now()}`, type: "BENEFIT", benefitDailyRate: null, userId: multiUserId },
    })
    await prisma.bankAccount.create({
      data: { name: `VA estimada ${Date.now()}`, type: "BENEFIT", benefitDailyRate: 15.75, userId: multiUserId },
    })
    await prisma.bankAccountMovement.createMany({
      data: [
        { bankAccountId: multiAccount.id, amount: 100.1, type: "INCOME", description: "RECARGA BENEFÍCIO: DEZEMBRO", date: new Date("2026-12-01T12:00:00"), userId: multiUserId },
        { bankAccountId: multiAccount.id, amount: 30.05, type: "EXPENSE", description: "Padaria", date: new Date("2026-12-05T12:00:00"), userId: multiUserId },
      ],
    })
  })

  afterAll(async () => {
    await prisma.bankAccountMovement.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.bankAccount.deleteMany({ where: { userId } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })

    await prisma.bankAccountMovement.deleteMany({ where: { userId: multiUserId } })
    await prisma.bankAccount.deleteMany({ where: { userId: multiUserId } })
    await prisma.financialMonth.deleteMany({ where: { userId: multiUserId } })
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId: multiUserId } })
    await prisma.user.deleteMany({ where: { id: multiUserId } })
  })

  it("soma VA recebido/gasto no mês e ignora Transaction INCOME da conta BENEFIT", async () => {
    const stats = await getDashboardStats(userId, month, prisma)

    expect(stats.income).toBe(5500)
    expect(stats.expense).toBe(300.8)
    expect(stats.balance).toBe(5199.2)
    expect(stats.benefitCredited).toBe(500)
    expect(stats.benefitSpent).toBe(200.8)
    expect(stats.benefitEstimated).toBe(false)
    expect(benefitAccountId).not.toBe("")
  })

  it("marca estimado quando o mês não tem crédito e usa rate x dias úteis", async () => {
    const stats = await getDashboardStats(userId, estimatedMonth, prisma)

    expect(stats.benefitEstimated).toBe(true)
    expect(stats.benefitCredited).toBe(462)
    expect(stats.benefitSpent).toBe(0)
    expect(stats.income).toBe(462)
    expect(stats.expense).toBe(0)
  })

  it("multi-conta: credita real, estima a conta sem crédito e arredonda centavos", async () => {
    const stats = await getDashboardStats(multiUserId, multiMonth, prisma)

    expect(stats.benefitCredited).toBe(462.35)
    expect(stats.benefitSpent).toBe(30.05)
    expect(stats.benefitEstimated).toBe(true)
    expect(stats.income).toBe(462.35)
    expect(stats.expense).toBe(30.05)
  })

  it("sem conta BENEFIT mantém os totais idênticos aos atuais", async () => {
    const plainId = `${userId}_plain`
    await prisma.user.create({
      data: { id: plainId, name: "Plain Dash", email: `plain-dash-${Date.now()}@test.com` },
    })
    const category = await prisma.category.create({
      data: { name: "Geral", type: "EXPENSE", color: "#9CA3AF", icon: "Tag", userId: plainId },
    })
    await prisma.transaction.createMany({
      data: [
        { amount: 1000, type: "INCOME", categoryId: category.id, userId: plainId, date: new Date("2026-10-01T12:00:00") },
        { amount: 250, type: "EXPENSE", categoryId: category.id, userId: plainId, date: new Date("2026-10-05T12:00:00") },
      ],
    })

    const stats = await getDashboardStats(plainId, month, prisma)

    expect(stats).toMatchObject({
      income: 1000,
      expense: 250,
      balance: 750,
      benefitCredited: 0,
      benefitSpent: 0,
      benefitEstimated: false,
    })

    await prisma.transaction.deleteMany({ where: { userId: plainId } })
    await prisma.financialMonth.deleteMany({ where: { userId: plainId } })
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId: plainId } })
    await prisma.category.deleteMany({ where: { userId: plainId } })
    await prisma.user.delete({ where: { id: plainId } })
  })
})
