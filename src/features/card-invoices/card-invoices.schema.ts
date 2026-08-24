import { z } from "zod"

export const cardInvoiceSchema = z.object({
  cardId: z.string().min(1, "Cartão é obrigatório"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mês deve estar no formato YYYY-MM"),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().min(0, "Valor não pode ser negativo").default(0),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  calculationMode: z.enum(["CALCULATED", "ENTERED_TOTAL"]).default("ENTERED_TOTAL"),
  lifecycleStatus: z.enum(["ESTIMATED", "OPEN", "CLOSED", "PAID"]).default("OPEN"),
  enteredTotal: z.coerce.number().min(0, "Valor não pode ser negativo").optional().nullable(),
  paidAt: z.coerce.date().optional().nullable(),
})

export const copyCardInvoicesSchema = z.object({
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mês deve estar no formato YYYY-MM"),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mês deve estar no formato YYYY-MM"),
  invoiceIds: z.array(z.string()).max(100).optional(),
})

export const cardInvoiceItemSchema = z.object({
  kind: z.enum(["MANUAL", "INSTALLMENT", "FIXED_COST", "IMPORTED", "FORECAST"]).default("MANUAL"),
  postingStatus: z.enum(["PROJECTED", "POSTED"]).default("POSTED"),
  description: z.string().trim().min(1, "Descrição é obrigatória").max(120),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  fixedCostOccurrenceId: z.string().optional().nullable(),
  importedTransactionId: z.string().optional().nullable(),
  installmentGroupId: z.string().optional().nullable(),
  installmentNumber: z.coerce.number().int().positive().optional().nullable(),
  installmentCount: z.coerce.number().int().positive().optional().nullable(),
})

type ParsedCardInvoiceInput = z.output<typeof cardInvoiceSchema>
type ParsedCardInvoiceItemInput = z.output<typeof cardInvoiceItemSchema>

export type CardInvoiceInput = Omit<ParsedCardInvoiceInput, "amount" | "status" | "calculationMode" | "lifecycleStatus"> &
  Partial<Pick<ParsedCardInvoiceInput, "amount" | "status" | "calculationMode" | "lifecycleStatus">>
export type CardInvoiceItemInput = Omit<ParsedCardInvoiceItemInput, "kind" | "postingStatus"> &
  Partial<Pick<ParsedCardInvoiceItemInput, "kind" | "postingStatus">>
