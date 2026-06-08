import { z } from "zod"

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  icon: z.string().default("wallet"),
  color: z.string().default("#0EA882"),
  type: z.enum(["INCOME", "EXPENSE"]),
})

export type CategoryInput = z.infer<typeof categorySchema>
