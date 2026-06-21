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
  startDate: z.string().min(1, "Data de início é obrigatória"),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM"]).default("MONTHLY"),
  customInterval: z.coerce.number().int().positive().optional().nullable(),
  customUnit: z.enum(["DAYS", "WEEKS", "MONTHS", "YEARS"]).optional().nullable(),
  endType: z.enum(["NONE", "DATE", "COUNT"]).default("NONE"),
  endDate: z.string().optional().nullable(),
  endAfterCount: z.coerce.number().int().positive().optional().nullable(),
}

export const fixedCostSchema = z.object(fixedCostShape).refine(
  (data) => !data.paidInsideCard || !!data.cardId,
  { message: "Cartão é obrigatório para custos pagos dentro do cartão", path: ["cardId"] }
).refine(
  (data) => data.type !== "INCOME" || !data.paidInsideCard,
  { message: "Receitas fixas não podem ser pagas dentro do cartão", path: ["paidInsideCard"] }
).refine(
  (data) => data.frequency !== "CUSTOM" || (data.customInterval != null && data.customUnit != null),
  { message: "Intervalo e unidade são obrigatórios para recorrência personalizada", path: ["customInterval"] }
).refine(
  (data) => data.endType !== "DATE" || !!data.endDate,
  { message: "Data de término é obrigatória quando selecionada", path: ["endDate"] }
).refine(
  (data) => data.endType !== "COUNT" || (data.endAfterCount != null && data.endAfterCount > 0),
  { message: "Número de ocorrências deve ser maior que zero", path: ["endAfterCount"] }
)

export const fixedCostPartialSchema = z.object(fixedCostShape).partial()

export type FixedCostInput = z.infer<typeof fixedCostSchema>
