import { z } from "zod"

const monthRegex = /^\d{4}-\d{2}$/

export const budgetSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Valor deve ser maior que zero")
    .max(99999999.99, "Valor muito alto"),
  month: z
    .string()
    .regex(monthRegex, "Formato inválido. Use AAAA-MM")
    .refine((val) => {
      const date = new Date(val + "-01T12:00:00")
      return !isNaN(date.getTime())
    }, "Mês inválido"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
})

export type BudgetInput = z.infer<typeof budgetSchema>
