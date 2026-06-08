import { z } from "zod"

export const transactionSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Valor deve ser maior que zero")
    .max(99999999.99, "Valor muito alto"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z
    .string()
    .max(200, "Descrição deve ter no máximo 200 caracteres")
    .optional(),
  date: z.coerce.date(),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
})

export type TransactionInput = z.infer<typeof transactionSchema>
