import { z } from "zod"

const fixedCostShape = {
  name: z.string().min(1, "Nome é obrigatório").max(80),
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  defaultAmount: z.coerce.number().positive("Valor deve ser maior que zero"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  paymentMethod: z.enum(["PIX", "BANK_SLIP", "DEBIT", "CREDIT_CARD", "CASH"]),
  dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  paidInsideCard: z.coerce.boolean().default(false),
  cardId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  active: z.coerce.boolean().default(true),
}

export const fixedCostSchema = z.object(fixedCostShape).refine(
  (data) => !data.paidInsideCard || !!data.cardId,
  { message: "Cartão é obrigatório para custos pagos dentro do cartão", path: ["cardId"] }
).refine(
  (data) => data.type !== "INCOME" || !data.paidInsideCard,
  { message: "Receitas fixas não podem ser pagas dentro do cartão", path: ["paidInsideCard"] }
)

export const fixedCostPartialSchema = z.object(fixedCostShape).partial()

export type FixedCostInput = z.infer<typeof fixedCostSchema>
