import { z } from "zod"

export const cardInvoiceSchema = z.object({
  cardId: z.string().min(1, "Cartão é obrigatório"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mês deve estar no formato YYYY-MM"),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().min(0, "Valor não pode ser negativo"),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  paidAt: z.coerce.date().optional().nullable(),
})

export type CardInvoiceInput = z.infer<typeof cardInvoiceSchema>
