// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createFixedCost, resetExpenseFixedCosts, OccurrenceOverrideNotAllowedError, StaleFixedCostOccurrenceError, updateFixedCost, updateFixedCostOccurrenceAmount } from "../fixed-costs.service"
import { resolveOccurrencePayment } from "../occurrence-payment"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"

const prisma = getTestClient()

describe("fixed-costs.service - update amount propagation", () => {
  let userId = ""
  let categoryId = ""
  let bankAccountId = ""
  const monthOf = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  const current = new Date()
  const month = monthOf(current)
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
    const prevMonth = monthOf(new Date(current.getFullYear(), current.getMonth() - 1, 1))
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

  it("personaliza pagamento e vencimento somente na ocorrência selecionada", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "PIX",
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

    const card = await prisma.card.create({
      data: { name: uniqueName(), userId },
    })
    const occurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: created.id, month, userId },
      include: { fixedCost: { select: { paymentMethod: true, paidInsideCard: true, cardId: true, bankAccountId: true, dueDay: true } } },
    })

    const result = await updateFixedCostOccurrenceAmount(created.id, userId, {
      occurrenceId: occurrence.id,
      month,
      scope: "THIS_MONTH",
      amount: 100,
      expectedUpdatedAt: occurrence.updatedAt.toISOString(),
      paymentMethod: "CREDIT_CARD",
      cardId: card.id,
      bankAccountId: null,
      dueDate: `${month}-20`,
    }, prisma)
    expect(result?.affected).toBe(1)

    const customized = await prisma.fixedCostOccurrence.findUniqueOrThrow({
      where: { id: occurrence.id },
      include: { fixedCost: { select: { paymentMethod: true, paidInsideCard: true, cardId: true, bankAccountId: true, dueDay: true } } },
    })
    expect(customized.paymentMethodOverride).toBe("CREDIT_CARD")
    expect(customized.cardIdOverride).toBe(card.id)
    expect(customized.bankAccountIdOverride).toBeNull()
    expect(customized.dueDate).toEqual(new Date(`${month}-20T00:00:00`))
    expect(customized.dueDateOverridden).toBe(true)
    expect(resolveOccurrencePayment(customized)).toMatchObject({
      paymentMethod: "CREDIT_CARD",
      paidInsideCard: true,
      cardId: card.id,
    })

    // Restaurar o padrão da série recomputa o vencimento pelo dueDay
    const restored = await updateFixedCostOccurrenceAmount(created.id, userId, {
      occurrenceId: occurrence.id,
      month,
      scope: "THIS_MONTH",
      amount: 100,
      expectedUpdatedAt: customized.updatedAt.toISOString(),
      dueDate: null,
    }, prisma)
    expect(restored?.affected).toBe(1)

    const backToDefault = await prisma.fixedCostOccurrence.findUniqueOrThrow({
      where: { id: occurrence.id },
    })
    expect(backToDefault.dueDate).toEqual(new Date(`${month}-10T00:00:00`))
    expect(backToDefault.dueDateOverridden).toBe(false)
    expect(backToDefault.paymentMethodOverride).toBe("CREDIT_CARD")
  })

  it("rejeita personalização fora do escopo desta ocorrência", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "PIX",
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

    const occurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: created.id, month, userId },
    })

    await expect(
      updateFixedCostOccurrenceAmount(created.id, userId, {
        occurrenceId: occurrence.id,
        month,
        scope: "ENTIRE_SERIES",
        amount: 100,
        expectedUpdatedAt: occurrence.updatedAt.toISOString(),
        paymentMethod: "CASH",
      }, prisma),
    ).rejects.toBeInstanceOf(OccurrenceOverrideNotAllowedError)
  })

  it("rejeita cartão em receita fixa e cartão inexistente", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "INCOME",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "PIX",
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

    const occurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: created.id, month, userId },
    })

    await expect(
      updateFixedCostOccurrenceAmount(created.id, userId, {
        occurrenceId: occurrence.id,
        month,
        scope: "THIS_MONTH",
        amount: 100,
        expectedUpdatedAt: occurrence.updatedAt.toISOString(),
        paymentMethod: "CREDIT_CARD",
        cardId: "card-inexistente",
      }, prisma),
    ).rejects.toMatchObject({ reason: "INCOME" })

    const expense = await createFixedCost(userId, {
      name: uniqueName(),
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "PIX",
      dueDay: 10,
      paidInsideCard: false,
      bankAccountId,
      active: true,
      startDate: `${month}-01`,
      frequency: "MONTHLY",
      endType: "NONE",
    }, prisma)
    if (!expense) return
    const expenseOccurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: expense.id, month, userId },
    })

    await expect(
      updateFixedCostOccurrenceAmount(expense.id, userId, {
        occurrenceId: expenseOccurrence.id,
        month,
        scope: "THIS_MONTH",
        amount: 100,
        expectedUpdatedAt: expenseOccurrence.updatedAt.toISOString(),
        paymentMethod: "CREDIT_CARD",
        cardId: "card-inexistente",
      }, prisma),
    ).rejects.toMatchObject({ reason: "CARD" })
  })

  it("troca somente o cartão quando a série já é paga no cartão", async () => {
    const name = uniqueName()
    const seriesCard = await prisma.card.create({ data: { name: uniqueName(), userId } })
    const otherCard = await prisma.card.create({ data: { name: uniqueName(), userId } })
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "CREDIT_CARD",
      dueDay: 10,
      paidInsideCard: true,
      cardId: seriesCard.id,
      active: true,
      startDate: `${month}-01`,
      frequency: "MONTHLY",
      endType: "NONE",
    }, prisma)
    expect(created).not.toBeNull()
    if (!created) return

    const occurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: created.id, month, userId },
      include: { fixedCost: { select: { paymentMethod: true, paidInsideCard: true, cardId: true, bankAccountId: true, dueDay: true } } },
    })

    const result = await updateFixedCostOccurrenceAmount(created.id, userId, {
      occurrenceId: occurrence.id,
      month,
      scope: "THIS_MONTH",
      amount: 100,
      expectedUpdatedAt: occurrence.updatedAt.toISOString(),
      paymentMethod: null,
      cardId: otherCard.id,
    }, prisma)
    expect(result?.affected).toBe(1)

    const customized = await prisma.fixedCostOccurrence.findUniqueOrThrow({
      where: { id: occurrence.id },
      include: { fixedCost: { select: { paymentMethod: true, paidInsideCard: true, cardId: true, bankAccountId: true, dueDay: true } } },
    })
    expect(customized.paymentMethodOverride).toBeNull()
    expect(customized.cardIdOverride).toBe(otherCard.id)
    expect(resolveOccurrencePayment(customized)).toMatchObject({
      paidInsideCard: true,
      cardId: otherCard.id,
    })
  })

  it("rejeita cartão quando a forma efetiva não é cartão", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "PIX",
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

    const card = await prisma.card.create({ data: { name: uniqueName(), userId } })
    const occurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: created.id, month, userId },
    })

    await expect(
      updateFixedCostOccurrenceAmount(created.id, userId, {
        occurrenceId: occurrence.id,
        month,
        scope: "THIS_MONTH",
        amount: 100,
        expectedUpdatedAt: occurrence.updatedAt.toISOString(),
        paymentMethod: null,
        cardId: card.id,
      }, prisma),
    ).rejects.toMatchObject({ reason: "CARD_METHOD" })
  })

  it("rejeita vencimento fora do mês da ocorrência", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId,
      paymentMethod: "PIX",
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

    const occurrence = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: created.id, month, userId },
    })
    const nextMonth = monthOf(new Date(current.getFullYear(), current.getMonth() + 1, 1))

    await expect(
      updateFixedCostOccurrenceAmount(created.id, userId, {
        occurrenceId: occurrence.id,
        month,
        scope: "THIS_MONTH",
        amount: 100,
        expectedUpdatedAt: occurrence.updatedAt.toISOString(),
        dueDate: `${nextMonth}-05`,
      }, prisma),
    ).rejects.toMatchObject({ reason: "DUE_DATE" })
  })

  it("aplica valor a partir da ocorrência selecionada e preserva histórico protegido", async () => {
    const months = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]
    const financialMonths = await Promise.all(months.map((item) => ensureFinancialMonth(userId, item, prisma)))
    await prisma.financialMonth.update({ where: { id: financialMonths[3].id }, data: { status: "CLOSED" } })
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: uniqueName(),
        type: "EXPENSE",
        defaultAmount: 100,
        categoryId,
        paymentMethod: "DEBIT",
        bankAccountId,
        active: true,
        startDate: new Date("2026-10-05T12:00:00Z"),
        frequency: "MONTHLY",
        endType: "NONE",
        userId,
      },
    })
    const created = await Promise.all(months.map((item, index) => prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: fixedCost.id,
        financialMonthId: financialMonths[index].id,
        month: item,
        scheduledDate: new Date(`${item}-05T12:00:00Z`),
        dueDate: new Date(`${item}-05T12:00:00Z`),
        amount: 100,
        status: index === 2 ? "PAID" : "PENDING",
        paidAt: index === 2 ? new Date() : null,
        deletedAt: index === 4 ? new Date() : null,
        userId,
      },
    })))

    const thisMonth = await updateFixedCostOccurrenceAmount(fixedCost.id, userId, {
      occurrenceId: created[1].id,
      month: "2026-11",
      scope: "THIS_MONTH",
      amount: 150,
      expectedUpdatedAt: created[1].updatedAt.toISOString(),
    }, prisma)
    expect(thisMonth).toMatchObject({ affected: 1, skipped: { paid: 0, closed: 0, deleted: 0 } })
    expect((await prisma.fixedCostOccurrence.findUnique({ where: { id: created[0].id } }))?.amount.toNumber()).toBe(100)
    expect((await prisma.fixedCost.findUnique({ where: { id: fixedCost.id } }))?.defaultAmount.toNumber()).toBe(100)

    const selected = await prisma.fixedCostOccurrence.findUniqueOrThrow({ where: { id: created[1].id } })
    const future = await updateFixedCostOccurrenceAmount(fixedCost.id, userId, {
      occurrenceId: selected.id,
      month: selected.month,
      scope: "THIS_AND_FUTURE",
      amount: 200,
      expectedUpdatedAt: selected.updatedAt.toISOString(),
    }, prisma)
    expect(future).toMatchObject({ affected: 1, skipped: { paid: 1, closed: 1, deleted: 1 } })
    expect((await prisma.fixedCostOccurrence.findUnique({ where: { id: created[0].id } }))?.amount.toNumber()).toBe(100)
    expect((await prisma.fixedCostOccurrence.findUnique({ where: { id: created[2].id } }))?.amount.toNumber()).toBe(100)
    expect((await prisma.fixedCost.findUnique({ where: { id: fixedCost.id } }))?.defaultAmount.toNumber()).toBe(100)
    expect(await prisma.fixedCostAmountRevision.count({ where: { fixedCostId: fixedCost.id } })).toBe(1)
  })

  it("usa revisão efetiva ao materializar meses fora de ordem", async () => {
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: uniqueName(), type: "EXPENSE", defaultAmount: 100, categoryId,
        paymentMethod: "DEBIT", bankAccountId, active: true,
        startDate: new Date("2026-10-05T12:00:00Z"), frequency: "MONTHLY", endType: "NONE", userId,
      },
    })
    const novemberMonth = await ensureFinancialMonth(userId, "2026-11", prisma)
    await ensureFixedCostOccurrences(userId, "2026-11", novemberMonth.id, prisma)
    const november = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: fixedCost.id, month: "2026-11", userId },
    })

    await updateFixedCostOccurrenceAmount(fixedCost.id, userId, {
      occurrenceId: november.id,
      month: november.month,
      scope: "THIS_AND_FUTURE",
      amount: 200,
      expectedUpdatedAt: november.updatedAt.toISOString(),
    }, prisma)

    const octoberMonth = await ensureFinancialMonth(userId, "2026-10", prisma)
    const decemberMonth = await ensureFinancialMonth(userId, "2026-12", prisma)
    await ensureFixedCostOccurrences(userId, "2026-10", octoberMonth.id, prisma)
    await ensureFixedCostOccurrences(userId, "2026-12", decemberMonth.id, prisma)

    const [october, december] = await Promise.all([
      prisma.fixedCostOccurrence.findFirstOrThrow({ where: { fixedCostId: fixedCost.id, month: "2026-10", userId } }),
      prisma.fixedCostOccurrence.findFirstOrThrow({ where: { fixedCostId: fixedCost.id, month: "2026-12", userId } }),
    ])
    expect(october.amount.toNumber()).toBe(100)
    expect(december.amount.toNumber()).toBe(200)

    const refreshedNovember = await prisma.fixedCostOccurrence.findUniqueOrThrow({ where: { id: november.id } })
    await updateFixedCostOccurrenceAmount(fixedCost.id, userId, {
      occurrenceId: november.id,
      month: november.month,
      scope: "ENTIRE_SERIES",
      amount: 300,
      expectedUpdatedAt: refreshedNovember.updatedAt.toISOString(),
    }, prisma)
    expect(await prisma.fixedCostAmountRevision.count({ where: { fixedCostId: fixedCost.id } })).toBe(0)
    expect((await prisma.fixedCost.findUniqueOrThrow({ where: { id: fixedCost.id } })).defaultAmount.toNumber()).toBe(300)
    const reconciled = await prisma.fixedCostOccurrence.findMany({
      where: { fixedCostId: fixedCost.id, userId },
      orderBy: { month: "asc" },
    })
    expect(reconciled.map((item) => item.amount.toNumber())).toEqual([300, 300, 300])

    const laterMonth = await ensureFinancialMonth(userId, "2027-03", prisma)
    await ensureFixedCostOccurrences(userId, "2027-03", laterMonth.id, prisma)
    const later = await prisma.fixedCostOccurrence.findFirstOrThrow({
      where: { fixedCostId: fixedCost.id, month: "2027-03", userId },
    })
    expect(later.amount.toNumber()).toBe(300)
  })

  it("rejeita edição baseada em versão desatualizada da ocorrência", async () => {
    const financialMonth = await ensureFinancialMonth(userId, "2028-01", prisma)
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: uniqueName(), type: "EXPENSE", defaultAmount: 100, categoryId,
        paymentMethod: "DEBIT", bankAccountId, active: true,
        startDate: new Date("2028-01-01T12:00:00Z"), frequency: "MONTHLY", endType: "NONE", userId,
      },
    })
    const occurrence = await prisma.fixedCostOccurrence.create({
      data: { fixedCostId: fixedCost.id, financialMonthId: financialMonth.id, month: "2028-01", amount: 100, userId },
    })

    await expect(updateFixedCostOccurrenceAmount(fixedCost.id, userId, {
      occurrenceId: occurrence.id,
      month: occurrence.month,
      scope: "THIS_MONTH",
      amount: 120,
      expectedUpdatedAt: new Date(occurrence.updatedAt.getTime() - 1000).toISOString(),
    }, prisma)).rejects.toBeInstanceOf(StaleFixedCostOccurrenceError)
  })

  it.each([
    { reason: "PAID" as const, month: "2030-01", status: "PAID" as const, closed: false, deleted: false },
    { reason: "CLOSED" as const, month: "2030-02", status: "PENDING" as const, closed: true, deleted: false },
    { reason: "DELETED" as const, month: "2030-03", status: "PENDING" as const, closed: false, deleted: true },
  ])("rejeita THIS_MONTH para ocorrência protegida: $reason", async ({ reason, month, status, closed, deleted }) => {
    const financialMonth = await ensureFinancialMonth(userId, month, prisma)
    if (closed) await prisma.financialMonth.update({ where: { id: financialMonth.id }, data: { status: "CLOSED" } })
    const fixedCost = await prisma.fixedCost.create({
      data: {
        name: uniqueName(), type: "EXPENSE", defaultAmount: 100, categoryId,
        paymentMethod: "DEBIT", bankAccountId, active: true,
        startDate: new Date(`${month}-01T12:00:00Z`), frequency: "MONTHLY", endType: "NONE", userId,
      },
    })
    const occurrence = await prisma.fixedCostOccurrence.create({
      data: {
        fixedCostId: fixedCost.id,
        financialMonthId: financialMonth.id,
        month,
        amount: 100,
        status,
        paidAt: status === "PAID" ? new Date() : null,
        deletedAt: deleted ? new Date() : null,
        userId,
      },
    })

    await expect(updateFixedCostOccurrenceAmount(fixedCost.id, userId, {
      occurrenceId: occurrence.id,
      month,
      scope: "THIS_MONTH",
      amount: 999,
      expectedUpdatedAt: occurrence.updatedAt.toISOString(),
    }, prisma)).rejects.toMatchObject({ reason })
    expect((await prisma.fixedCostOccurrence.findUniqueOrThrow({ where: { id: occurrence.id } })).amount.toNumber()).toBe(100)
    expect((await prisma.fixedCost.findUniqueOrThrow({ where: { id: fixedCost.id } })).defaultAmount.toNumber()).toBe(100)
    expect(await prisma.fixedCostAmountRevision.count({ where: { fixedCostId: fixedCost.id } })).toBe(0)
  })

  it("usa isolamento serializável e traduz conflito transacional em stale edit", async () => {
    const transaction = vi.fn().mockRejectedValue(Object.assign(new Error("write conflict"), { code: "P2034" }))

    await expect(updateFixedCostOccurrenceAmount("fixed", userId, {
      occurrenceId: "occurrence",
      month: "2031-01",
      scope: "THIS_MONTH",
      amount: 100,
      expectedUpdatedAt: "2031-01-01T00:00:00.000Z",
    }, { $transaction: transaction } as never)).rejects.toBeInstanceOf(StaleFixedCostOccurrenceError)
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" })
  })

  it("gera vencimento no dia 1 ao consultar mês futuro", async () => {
    const name = uniqueName()
    const created = await createFixedCost(userId, {
      name,
      type: "EXPENSE",
      defaultAmount: 88.77,
      categoryId,
      paymentMethod: "DEBIT",
      dueDay: 1,
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
    expect(occurrence?.dueDate?.toISOString().slice(0, 10)).toBe(`${futureMonth}-01`)
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
