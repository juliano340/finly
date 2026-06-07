import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import type { CategoryInput } from "./categories.schema"
import type { CategoryWithCount } from "./categories.types"

export async function getCategories(
  userId: string,
  client?: PrismaClient
): Promise<CategoryWithCount[]> {
  const db = client ?? defaultPrisma
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      type: true,
      userId: true,
      _count: { select: { transactions: true, budgets: true } },
    },
  })
}

export async function createCategory(
  userId: string,
  input: CategoryInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  return db.category.create({
    data: { ...input, userId },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      type: true,
      userId: true,
      _count: { select: { transactions: true, budgets: true } },
    },
  })
}

export async function updateCategory(
  id: string,
  userId: string,
  input: Partial<CategoryInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const category = await db.category.findUnique({ where: { id } })
  if (!category || category.userId !== userId) return null

  return db.category.update({
    where: { id },
    data: input,
  })
}

export async function deleteCategory(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const category = await db.category.findUnique({ where: { id } })
  if (!category || category.userId !== userId) return null

  const txCount = await db.transaction.count({ where: { categoryId: id } })
  if (txCount > 0) return { blocked: true, count: txCount }

  await db.category.delete({ where: { id } })
  return { blocked: false, count: 0 }
}
