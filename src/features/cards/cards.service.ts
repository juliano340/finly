import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import type { CardInput } from "./cards.schema"

export async function getCards(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  return db.card.findMany({
    where: { userId },
    include: { bankAccount: { select: { id: true, name: true, institution: true } } },
    orderBy: { name: "asc" },
  })
}

async function getValidBankAccount(
  userId: string,
  bankAccountId: string | null | undefined,
  db: PrismaClient
) {
  if (!bankAccountId) return null
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) return false
  return account
}

export async function createCard(
  userId: string,
  input: CardInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const bankAccount = await getValidBankAccount(userId, input.bankAccountId, db)
  if (bankAccount === false) return null
  const color = bankAccount && input.color === "#22C55E" ? bankAccount.color : input.color

  return db.card.create({
    data: {
      name: input.name,
      brand: input.brand ?? null,
      color,
      closingDay: input.closingDay ?? null,
      dueDay: input.dueDay ?? null,
      bankAccountId: input.bankAccountId ?? null,
      userId,
    },
    include: { bankAccount: { select: { id: true, name: true, institution: true } } },
  })
}

export async function updateCard(
  id: string,
  userId: string,
  input: Partial<CardInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const card = await db.card.findUnique({ where: { id } })
  if (!card || card.userId !== userId) return null
  const bankAccount = await getValidBankAccount(userId, input.bankAccountId, db)
  if (bankAccount === false) return null
  const bankAccountChanged = input.bankAccountId !== undefined && input.bankAccountId !== card.bankAccountId
  const shouldUseBankColor = !!bankAccount && bankAccountChanged && (input.color === undefined || input.color === card.color)

  return db.card.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.brand !== undefined && { brand: input.brand }),
      ...(shouldUseBankColor && { color: bankAccount.color }),
      ...(!shouldUseBankColor && input.color !== undefined && { color: input.color }),
      ...(input.closingDay !== undefined && { closingDay: input.closingDay }),
      ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
    },
    include: { bankAccount: { select: { id: true, name: true, institution: true } } },
  })
}

export async function deleteCard(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const card = await db.card.findUnique({ where: { id } })
  if (!card || card.userId !== userId) return false

  await db.card.delete({ where: { id } })
  return true
}
