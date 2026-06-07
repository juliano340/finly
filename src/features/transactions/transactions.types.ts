import type { PrismaClient } from "@/generated/prisma"
import type { TransactionInput } from "./transactions.schema"

export type TransactionWithRelations = {
  id: string
  amount: number
  type: "INCOME" | "EXPENSE"
  description: string | null
  date: Date
  categoryId: string
  userId: string
  category: { id: string; name: string; color: string; icon: string }
}
