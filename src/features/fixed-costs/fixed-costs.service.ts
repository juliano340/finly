import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import type { FixedCostInput } from "./fixed-costs.schema"

async function validateFixedCostRelations(
  userId: string,
  input: Pick<FixedCostInput, "categoryId" | "cardId" | "paidInsideCard" | "bankAccountId">,
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

  return db.fixedCost.create({
    data: {
      name: input.name,
      defaultAmount: input.defaultAmount,
      categoryId: input.categoryId,
      paymentMethod: input.paymentMethod,
      paidInsideCard: input.paidInsideCard,
      cardId: input.paidInsideCard ? input.cardId : null,
      bankAccountId: input.bankAccountId ?? null,
      active: input.active,
      userId,
    },
    include: { category: true, card: true, bankAccount: true },
  })
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
      categoryId: next.categoryId,
      cardId: next.cardId,
      paidInsideCard: next.paidInsideCard,
      bankAccountId: next.bankAccountId,
    },
    db
  )
  if (!valid) return null

  return db.fixedCost.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.defaultAmount !== undefined && { defaultAmount: input.defaultAmount }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
      ...(input.paidInsideCard !== undefined && { paidInsideCard: input.paidInsideCard }),
      cardId: next.paidInsideCard ? next.cardId : null,
      ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: { category: true, card: true, bankAccount: true },
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
