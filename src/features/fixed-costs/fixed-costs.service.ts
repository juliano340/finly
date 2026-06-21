import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import type { FixedCostInput } from "./fixed-costs.schema"
import { ensureFixedCostOccurrencesForMonths } from "@/features/monthly-closing/monthly-closing.service"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"

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
  return db.fixedCost.findMany({
    where: { userId },
    include: { category: true, card: true, bankAccount: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })
}

export async function createFixedCost(
  userId: string,
  input: FixedCostInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const valid = await validateFixedCostRelations(userId, input, db)
  if (!valid) return null

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
  await ensureFixedCostOccurrencesForMonths(userId, [{ month: currentMonth, financialMonthId: fm.id }], db)

  return created
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
      await db.fixedCostOccurrence.updateMany({
        where: { fixedCostId: id, userId, status: "PENDING" },
        data: { amount: input.defaultAmount },
      })
    }
    return updated
  })
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
