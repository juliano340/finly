import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import type { FixedCostInput, FixedCostOccurrenceAmountUpdateInput } from "./fixed-costs.schema"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"
import { moneyToNumber, type MoneyValue } from "@/lib/money"

export class DuplicateFixedCostNameError extends Error {
  constructor() {
    super("Já existe um lançamento fixo com este nome")
  }
}

export class StaleFixedCostOccurrenceError extends Error {
  constructor() {
    super("Este lançamento foi alterado por outra operação. Recarregue e tente novamente.")
  }
}

export class ProtectedFixedCostOccurrenceError extends Error {
  constructor(public readonly reason: "PAID" | "CLOSED" | "DELETED") {
    super(
      reason === "PAID"
        ? "Esta ocorrência já foi paga e não pode ser alterada."
        : reason === "CLOSED"
          ? "Esta ocorrência pertence a um mês fechado e não pode ser alterada."
          : "Esta ocorrência foi excluída e não pode ser alterada."
    )
  }
}

export async function updateFixedCostOccurrenceAmount(
  fixedCostId: string,
  userId: string,
  input: FixedCostOccurrenceAmountUpdateInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma

  try {
    return await db.$transaction(async (tx) => {
    const selected = await tx.fixedCostOccurrence.findFirst({
      where: {
        id: input.occurrenceId,
        fixedCostId,
        userId,
        month: input.month,
      },
      include: { financialMonth: { select: { status: true } } },
    })
    if (!selected) return null
    if (selected.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) {
      throw new StaleFixedCostOccurrenceError()
    }
    if (input.scope === "THIS_MONTH") {
      if (selected.deletedAt) throw new ProtectedFixedCostOccurrenceError("DELETED")
      if (selected.status === "PAID") throw new ProtectedFixedCostOccurrenceError("PAID")
      if (selected.financialMonth.status === "CLOSED") throw new ProtectedFixedCostOccurrenceError("CLOSED")
    }

    const occurrences = await tx.fixedCostOccurrence.findMany({
      where: { fixedCostId, userId },
      include: { financialMonth: { select: { status: true } } },
    })
    const selectedCutoff = selected.scheduledDate ?? selected.dueDate
    const effectiveAt = selectedCutoff ?? new Date(`${input.month}-01T00:00:00.000Z`)
    const isInScope = (occurrence: (typeof occurrences)[number]) => {
      if (input.scope === "THIS_MONTH") return occurrence.id === selected.id
      if (input.scope === "ENTIRE_SERIES") return true

      const occurrenceCutoff = occurrence.scheduledDate ?? occurrence.dueDate
      if (selectedCutoff && occurrenceCutoff) {
        return occurrenceCutoff.getTime() >= selectedCutoff.getTime()
      }
      return occurrence.id === selected.id || occurrence.month >= input.month
    }

    const scoped = occurrences.filter(isInScope)
    const skipped = { paid: 0, closed: 0, deleted: 0 }
    const affectedIds: string[] = []
    for (const occurrence of scoped) {
      if (occurrence.deletedAt) skipped.deleted += 1
      else if (occurrence.status === "PAID") skipped.paid += 1
      else if (occurrence.financialMonth.status === "CLOSED") skipped.closed += 1
      else affectedIds.push(occurrence.id)
    }

    let affected = 0
    if (affectedIds.length > 0) {
      const updated = await tx.fixedCostOccurrence.updateMany({
        where: {
          id: { in: affectedIds },
          userId,
          fixedCostId,
          status: "PENDING",
          deletedAt: null,
          financialMonth: { status: "OPEN" },
        },
        data: { amount: input.amount },
      })
      affected = updated.count
    }

    if (input.scope === "THIS_AND_FUTURE") {
      await tx.fixedCostAmountRevision.deleteMany({
        where: { fixedCostId, effectiveAt: { gte: effectiveAt } },
      })
      await tx.fixedCostAmountRevision.create({
        data: { fixedCostId, effectiveAt, amount: input.amount },
      })
    }

    if (input.scope === "ENTIRE_SERIES") {
      await tx.fixedCost.update({
        where: { id: fixedCostId },
        data: { defaultAmount: input.amount },
      })
      await tx.fixedCostAmountRevision.deleteMany({ where: { fixedCostId } })
    }

    return {
      scope: input.scope,
      cutoff: { occurrenceId: selected.id, month: selected.month },
      affected,
      skipped,
      conflicts: affected === affectedIds.length ? [] as string[] : ["CONCURRENT_CHANGE"],
    }
    }, { isolationLevel: "Serializable" })
  } catch (error) {
    if (isTransactionConflict(error)) throw new StaleFixedCostOccurrenceError()
    throw error
  }
}

function isTransactionConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034"
}

async function validateFixedCostRelations(
  userId: string,
  input: Pick<FixedCostInput, "type" | "categoryId" | "cardId" | "paidInsideCard" | "bankAccountId">,
  db: PrismaClient
) {
  const category = await db.category.findUnique({ where: { id: input.categoryId } })
  if (!category || category.userId !== userId) return false
  if (input.bankAccountId) {
    const account = await db.bankAccount.findUnique({ where: { id: input.bankAccountId } })
    if (!account || account.userId !== userId) return false
  }
  if (!input.paidInsideCard) return true
  if (!input.cardId) return false
  const card = await db.card.findUnique({ where: { id: input.cardId } })
  return !!card && card.userId === userId
}

export async function getFixedCosts(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const fixedCosts = await db.fixedCost.findMany({
    where: { userId },
    include: { category: true, card: true, bankAccount: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })
  return fixedCosts.map(normalizeFixedCost)
}

export async function createFixedCost(
  userId: string,
  input: FixedCostInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const valid = await validateFixedCostRelations(userId, input, db)
  if (!valid) return null

  const existing = await db.fixedCost.findUnique({
    where: { name_userId: { name: input.name, userId } },
    select: { id: true },
  })
  if (existing) throw new DuplicateFixedCostNameError()

  const created = await db.fixedCost.create({
    data: {
      name: input.name,
      type: input.type,
      defaultAmount: input.defaultAmount,
      categoryId: input.categoryId,
      paymentMethod: input.paymentMethod,
      dueDay: input.dueDay ?? null,
      paidInsideCard: input.paidInsideCard,
      cardId: input.paidInsideCard ? input.cardId : null,
      bankAccountId: input.bankAccountId ?? null,
      active: input.active,
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      frequency: input.frequency ?? "MONTHLY",
      customInterval: (input.frequency ?? "MONTHLY") === "CUSTOM" ? (input.customInterval ?? null) : null,
      customUnit: (input.frequency ?? "MONTHLY") === "CUSTOM" ? (input.customUnit ?? null) : null,
      endType: input.endType ?? "NONE",
      endDate: input.endDate ? new Date(input.endDate) : null,
      endAfterCount: input.endType === "COUNT" ? (input.endAfterCount ?? null) : null,
      userId,
    },
    include: { category: true, card: true, bankAccount: true },
  })

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const fm = await ensureFinancialMonth(userId, currentMonth, db)
  await ensureFixedCostOccurrences(userId, currentMonth, fm.id, db)

  return normalizeFixedCost(created)
}

export async function updateFixedCost(
  id: string,
  userId: string,
  input: Partial<FixedCostInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const fixedCost = await db.fixedCost.findUnique({ where: { id } })
  if (!fixedCost || fixedCost.userId !== userId) return null

  if (input.name !== undefined && input.name !== fixedCost.name) {
    const existing = await db.fixedCost.findUnique({
      where: { name_userId: { name: input.name, userId } },
      select: { id: true },
    })
    if (existing && existing.id !== id) throw new DuplicateFixedCostNameError()
  }

  const next = { ...fixedCost, ...input }
  const valid = await validateFixedCostRelations(
    userId,
    {
      type: next.type,
      categoryId: next.categoryId,
      cardId: next.cardId ?? undefined,
      paidInsideCard: next.paidInsideCard,
      bankAccountId: next.bankAccountId ?? undefined,
    },
    db
  )
  if (!valid) return null

  return db.fixedCost.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.defaultAmount !== undefined && { defaultAmount: input.defaultAmount }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
      ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      ...(input.paidInsideCard !== undefined && { paidInsideCard: input.paidInsideCard }),
      cardId: next.paidInsideCard ? next.cardId : null,
      ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.frequency !== undefined && input.frequency !== "CUSTOM" && { customInterval: null, customUnit: null }),
      ...(input.frequency === "CUSTOM" && input.customInterval !== undefined && { customInterval: input.customInterval }),
      ...(input.frequency === "CUSTOM" && input.customUnit !== undefined && { customUnit: input.customUnit }),
      ...(input.endType !== undefined && { endType: input.endType }),
      ...(input.endType !== undefined && input.endType !== "DATE" && { endDate: null }),
      ...(input.endType === "DATE" && input.endDate != null && { endDate: new Date(input.endDate) }),
      ...(input.endType !== undefined && input.endType !== "COUNT" && { endAfterCount: null }),
      ...(input.endType === "COUNT" && input.endAfterCount !== undefined && { endAfterCount: input.endAfterCount }),
    },
    include: { category: true, card: true, bankAccount: true },
  }).then(async (updated) => {
    if (input.defaultAmount !== undefined) {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      await db.fixedCostOccurrence.updateMany({
        where: {
          fixedCostId: id,
          userId,
          status: "PENDING",
          month: { gte: currentMonth },
          financialMonth: { status: "OPEN" },
        },
        data: { amount: input.defaultAmount },
      })
    }
    return normalizeFixedCost(updated)
  })
}

function normalizeFixedCost<
  T extends {
    defaultAmount: MoneyValue
    bankAccount?: null | { initialBalance: MoneyValue; overdraftLimit: MoneyValue }
  },
>(fixedCost: T) {
  return {
    ...fixedCost,
    defaultAmount: moneyToNumber(fixedCost.defaultAmount),
    ...(fixedCost.bankAccount && {
      bankAccount: {
        ...fixedCost.bankAccount,
        initialBalance: moneyToNumber(fixedCost.bankAccount.initialBalance),
        overdraftLimit: moneyToNumber(fixedCost.bankAccount.overdraftLimit),
      },
    }),
  }
}

export async function deleteFixedCost(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const fixedCost = await db.fixedCost.findUnique({ where: { id } })
  if (!fixedCost || fixedCost.userId !== userId) return false

  await db.fixedCost.delete({ where: { id } })
  return true
}

export async function resetExpenseFixedCosts(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const fixedCosts = await db.fixedCost.findMany({
    where: { userId, type: "EXPENSE" },
    select: { id: true },
  })
  const fixedCostIds = fixedCosts.map((item) => item.id)

  if (fixedCostIds.length === 0) {
    return { fixedCostsDeleted: 0, occurrencesDeleted: 0 }
  }

  return db.$transaction(async (tx) => {
    const occurrences = await tx.fixedCostOccurrence.deleteMany({
      where: { userId, fixedCostId: { in: fixedCostIds } },
    })
    const fixedCostsDeleted = await tx.fixedCost.deleteMany({
      where: { userId, type: "EXPENSE", id: { in: fixedCostIds } },
    })

    return {
      fixedCostsDeleted: fixedCostsDeleted.count,
      occurrencesDeleted: occurrences.count,
    }
  })
}
