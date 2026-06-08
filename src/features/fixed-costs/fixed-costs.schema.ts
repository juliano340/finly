import { z } from "zod"

export const fixedCostSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").max(80),
    defaultAmount: z.coerce.number().positive("Valor deve ser maior que zero"),
    categoryId: z.string().min(1, "Categoria é obrigatória"),
    paymentMethod: z.enum(["PIX", "BANK_SLIP", "DEBIT", "CREDIT_CARD", "CASH"]),
    paidInsideCard: z.coerce.boolean().default(false),
    cardId: z.string().optional().nullable(),
    bankAccountId: z.string().optional().nullable(),
    active: z.coerce.boolean().default(true),
  })
  .refine((data) => !data.paidInsideCard || !!data.cardId, {
    message: "Cartão é obrigatório para custos pagos dentro do cartão",
    path: ["cardId"],
  })

export type FixedCostInput = z.infer<typeof fixedCostSchema>
