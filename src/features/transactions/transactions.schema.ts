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
  bankAccountId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
}).refine(
  (input) => !(input.bankAccountId && input.invoiceId),
  { message: "Escolha uma conta bancária ou uma fatura, não as duas" },
).refine(
  (input) => !input.invoiceId || input.type === "EXPENSE",
  { message: "Somente despesas podem ser lançadas em faturas" },
)

export type TransactionInput = z.infer<typeof transactionSchema>
