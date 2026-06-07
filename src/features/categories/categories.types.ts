import type { PrismaClient } from "@/generated/prisma"
import type { CategoryInput } from "./categories.schema"

export type CategoryWithCount = {
  id: string
  name: string
  icon: string
  color: string
  type: "INCOME" | "EXPENSE"
  userId: string
  _count: { transactions: number; budgets: number }
}
