// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { ensureFixedCostOccurrences, getMonthlyClosing, markCardInvoiceFixedCostsPaid, markCardInvoiceFixedCostsPending, payFixedCostOccurrence, unpayFixedCostOccurrence } from "../monthly-closing.service"

const prisma = getTestClient()

describe("monthly-closing.service", () => {
  let userId = ""
  let categoryId = ""

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Closing User", email: `closing-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""

    const category = await prisma.category.create({
      data: { name: `Fechamento ${Date.now()}`, userId, type: "EXPENSE" },
    })
    categoryId = category.id
  })

  afterAll(async () => {
    await prisma.bankAccountMovement.deleteMany({ where: { userId } })
    await prisma.fixedCostOccurrence.deleteMany({ where: { userId } })
    await prisma.cardInvoice.deleteMany({ where: { userId } })
    await prisma.fixedCost.deleteMany({ where: { userId } })
    await prisma.bankAccount.deleteMany({ where: { userId } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it("calcula fechamento sem duplicar custo fixo dentro do cartão", async () => {
    const month = "2026-06"
    const card = await prisma.card.create({ data: { name: `Nubank ${Date.now()}`, userId } })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })

    const fixedCosts = await Promise.all([
      prisma.fixedCost.create({
        data: { name: `Internet ${Date.now()}`, defaultAmount: 120, categoryId, paymentMethod: "PIX", paidInsideCard: false, userId },
      }),
      prisma.fixedCost.create({
        data: { name: `Streaming ${Date.now()}`, defaultAmount: 50, categoryId, paymentMethod: "CREDIT_CARD", paidInsideCard: true, cardId: card.id, userId },
      }),
    ])
    await Promise.all([
      prisma.fixedCostOccurrence.create({
        data: { fixedCostId: fixedCosts[0].id, financialMonthId: financialMonth.id, month, amount: 120, status: "PENDING", dueDate: new Date("2026-06-10T12:00:00"), userId },
      }),
      prisma.fixedCostOccurrence.create({
        data: { fixedCostId: fixedCosts[1].id, financialMonthId: financialMonth.id, month, amount: 50, status: "PENDING", dueDate: new Date("2026-06-15T12:00:00"), userId },
      }),
    ])
    await prisma.cardInvoice.create({
      data: { cardId: card.id, financialMonthId: financialMonth.id, month, dueDate: new Date("2026-06-10T12:00:00"), amount: 300, userId },
    })
    await prisma.transaction.createMany({
      data: [
        { amount: 80, type: "EXPENSE", categoryId, userId, date: new Date("2026-06-05T12:00:00") },
        { amount: 1000, type: "INCOME", categoryId, userId, date: new Date("2026-06-06T12:00:00") },
      ],
    })

    const closing = await getMonthlyClosing(userId, month, prisma)

    expect(closing.summary.cardInvoicesTotal).toBe(300)
    expect(closing.summary.fixedCostsOutsideCardTotal).toBe(120)
    expect(closing.summary.fixedCostsInsideCardTotal).toBe(50)
    expect(closing.summary.looseExpensesTotal).toBe(80)
    expect(closing.summary.incomeTotal).toBe(1000)
    expect(closing.summary.totalToPay).toBe(500)
    expect(closing.summary.projectedBalance).toBe(500)
    expect(closing.summary.estimatedInvoicesByCard[0]?.estimatedAmount).toBe(50)
  })

  it("calcula saldo projetado como receitas totais menos gastos totais (pagos e não pagos)", async () => {
    const month = "2026-09"
    const suffix = Date.now()

    await prisma.fixedCostOccurrence.deleteMany({ where: { userId, month } })
    await prisma.fixedCost.deleteMany({ where: { userId } })

    const account = await prisma.bankAccount.create({
      data: { name: `Conta Saldo ${suffix}`, type: "CHECKING", color: "#000", initialBalance: 2000, userId },
    })
    await prisma.financialMonth.create({ data: { month, userId } })

    await prisma.transaction.createMany({
      data: [
        { amount: 500, type: "EXPENSE", categoryId, bankAccountId: account.id, userId, date: new Date("2026-09-05T12:00:00") },
        { amount: 200, type: "EXPENSE", categoryId, userId, date: new Date("2026-09-10T12:00:00") },
        { amount: 4000, type: "INCOME", categoryId, userId, date: new Date("2026-09-01T12:00:00") },
      ],
    })

    const closing = await getMonthlyClosing(userId, month, prisma)

    expect(closing.summary.looseExpensesTotal).toBe(700)
    expect(closing.summary.incomeTotal).toBe(4000)
    expect(closing.summary.totalSpent).toBe(700)
    expect(closing.summary.projectedBalance).toBe(3300)
  })

  it("bloqueia pagamento de custo fixo quando saldo excede cheque especial", async () => {
    const month = "2026-08"
    const suffix = Date.now()
    const account = await prisma.bankAccount.create({
      data: { name: `CustoFixoConta ${suffix}`, type: "CHECKING", color: "#000", initialBalance: 100, overdraftLimit: 200, userId },
    })
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: `CustoFixoCheque ${suffix}`,
        defaultAmount: 301,
        categoryId,
        paymentMethod: "PIX",
        bankAccountId: account.id,
        paidInsideCard: false,
        userId,
      },
    })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })
    const occurrence = await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: fixedCost.id, financialMonthId: financialMonth.id, month, amount: 301, dueDate: new Date(), status: "PENDING", userId },
    })

    await expect(payFixedCostOccurrence(occurrence.id, userId, prisma)).rejects.toThrow(
      /Saldo insuficiente/
    )
  })

  it("mantém pagamento idempotente e estorna somente o movimento vinculado", async () => {
    const month = "2026-10"
    const suffix = Date.now()
    const account = await prisma.bankAccount.create({
      data: { name: `Conta Idempotente ${suffix}`, type: "CHECKING", color: "#000", initialBalance: 1000, userId },
    })
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: `Internet Idempotente ${suffix}`,
        defaultAmount: 120,
        categoryId,
        paymentMethod: "PIX",
        bankAccountId: account.id,
        paidInsideCard: false,
        userId,
      },
    })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })
    const occurrence = await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: fixedCost.id, financialMonthId: financialMonth.id, month, amount: 120, dueDate: new Date("2026-10-10T12:00:00"), userId },
    })

    const transactionsBefore = await prisma.transaction.count({ where: { userId } })
    const [firstPayment, repeatedPayment] = await Promise.all([
      payFixedCostOccurrence(occurrence.id, userId, prisma),
      payFixedCostOccurrence(occurrence.id, userId, prisma),
    ])

    expect(firstPayment).not.toBeNull()
    expect(repeatedPayment).not.toBeNull()

    const paidOccurrence = await prisma.fixedCostOccurrence.findUnique({ where: { id: occurrence.id } })
    const linkedMovementId = paidOccurrence?.bankAccountMovementId
    expect(paidOccurrence?.status).toBe("PAID")
    expect(linkedMovementId).toBeTruthy()
    await expect(prisma.bankAccountMovement.count({
      where: { bankAccountId: account.id, description: `PAGAMENTO ${fixedCost.name}`, userId },
    })).resolves.toBe(1)
    await expect(prisma.transaction.count({ where: { userId } })).resolves.toBe(transactionsBefore)

    const decoy = await prisma.bankAccountMovement.create({
      data: {
        bankAccountId: account.id,
        amount: occurrence.amount,
        type: fixedCost.type,
        description: `PAGAMENTO ${fixedCost.name}`,
        date: new Date(),
        userId,
      },
    })

    const unpaid = await unpayFixedCostOccurrence(occurrence.id, userId, prisma)
    expect(unpaid?.status).toBe("PENDING")
    expect(unpaid?.bankAccountMovementId).toBeNull()
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: linkedMovementId! } })).resolves.toBeNull()
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: decoy.id } })).resolves.not.toBeNull()

    const legacyMonth = "2026-11"
    const legacyFinancialMonth = await prisma.financialMonth.create({ data: { month: legacyMonth, userId } })
    const legacyOccurrence = await prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: fixedCost.id,
        financialMonthId: legacyFinancialMonth.id,
        month: legacyMonth,
        amount: 120,
        dueDate: new Date("2026-11-10T12:00:00"),
        status: "PAID",
        paidAt: new Date(),
        userId,
      },
    })
    await prisma.bankAccountMovement.create({
      data: {
        bankAccountId: account.id,
        amount: legacyOccurrence.amount,
        type: fixedCost.type,
        description: `PAGAMENTO ${fixedCost.name}`,
        date: new Date(),
        userId,
      },
    })

    await expect(unpayFixedCostOccurrence(legacyOccurrence.id, userId, prisma)).resolves.toBeNull()
    await expect(prisma.fixedCostOccurrence.findUnique({ where: { id: legacyOccurrence.id } }))
      .resolves.toMatchObject({ status: "PAID", bankAccountMovementId: null })
  })

  it("gera recorrências diárias por data sem duplicar em reprocessamento concorrente", async () => {
    const month = "2027-02"
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: `Diário ${Date.now()}`,
        defaultAmount: 15,
        categoryId,
        paymentMethod: "PIX",
        dueDay: 10,
        startDate: new Date("2027-02-01T12:00:00"),
        frequency: "DAILY",
        endType: "DATE",
        endDate: new Date("2027-02-03T12:00:00"),
        userId,
      },
    })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })

    await Promise.all([
      ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma),
      ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma),
    ])

    const occurrences = await prisma.fixedCostOccurrence.findMany({
      where: { fixedCostId: fixedCost.id, month, userId },
      orderBy: { scheduledDate: "asc" },
    })
    expect(occurrences).toHaveLength(3)
    expect(new Set(occurrences.map((item) => item.scheduledDate?.getTime())).size).toBe(3)
    expect(new Set(occurrences.map((item) => item.dueDate?.getTime())).size).toBe(1)

    const removedScheduledDate = occurrences[1].scheduledDate
    await prisma.fixedCostOccurrence.delete({ where: { id: occurrences[1].id } })
    await ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma)

    const rebuilt = await prisma.fixedCostOccurrence.findMany({
      where: { fixedCostId: fixedCost.id, month, userId },
    })
    expect(rebuilt).toHaveLength(3)
    expect(rebuilt.some((item) => item.scheduledDate?.getTime() === removedScheduledDate?.getTime())).toBe(true)
  })

  it("preserva ocorrência legada e cria somente as datas recorrentes ausentes", async () => {
    const month = "2027-03"
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: `Diário legado ${Date.now()}`,
        defaultAmount: 20,
        categoryId,
        paymentMethod: "PIX",
        dueDay: 10,
        startDate: new Date("2027-03-01T12:00:00"),
        frequency: "DAILY",
        endType: "DATE",
        endDate: new Date("2027-03-03T12:00:00"),
        userId,
      },
    })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })
    const legacy = await prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: fixedCost.id,
        financialMonthId: financialMonth.id,
        month,
        dueDate: new Date("2027-03-10T12:00:00"),
        amount: 20,
        userId,
      },
    })

    await ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma)
    await ensureFixedCostOccurrences(userId, month, financialMonth.id, prisma)

    const occurrences = await prisma.fixedCostOccurrence.findMany({
      where: { fixedCostId: fixedCost.id, month, userId },
    })
    expect(occurrences).toHaveLength(3)
    expect(occurrences.some((item) => item.id === legacy.id && item.scheduledDate === null)).toBe(true)
    expect(occurrences.filter((item) => item.scheduledDate !== null)).toHaveLength(2)
  })

  it("sincroniza custos fixos inclusos no cartão ao pagar e estornar fatura", async () => {
    const month = "2026-07"
    const card = await prisma.card.create({ data: { name: `Cartao Sync ${Date.now()}`, userId } })
    const financialMonth = await prisma.financialMonth.create({ data: { month, userId } })
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: `Streaming Sync ${Date.now()}`,
        defaultAmount: 79.9,
        categoryId,
        paymentMethod: "CREDIT_CARD",
        paidInsideCard: true,
        cardId: card.id,
        startDate: new Date("2026-06-01T12:00:00"),
        userId,
      },
    })
    const invoice = await prisma.cardInvoice.create({
      data: { cardId: card.id, financialMonthId: financialMonth.id, month, dueDate: new Date("2026-07-10T12:00:00"), amount: 300, userId },
    })

    await markCardInvoiceFixedCostsPaid(userId, invoice, new Date("2026-07-09T12:00:00"), prisma)

    const paidOccurrence = await prisma.fixedCostOccurrence.findFirst({
      where: { fixedCostId: fixedCost.id, month, userId },
    })
    expect(paidOccurrence?.status).toBe("PAID")
    expect(paidOccurrence?.paidAt).not.toBeNull()

    await markCardInvoiceFixedCostsPending(userId, invoice, prisma)

    const pendingOccurrence = await prisma.fixedCostOccurrence.findFirst({
      where: { fixedCostId: fixedCost.id, month, userId },
    })
    expect(pendingOccurrence?.status).toBe("PENDING")
    expect(pendingOccurrence?.paidAt).toBeNull()
  })
})
