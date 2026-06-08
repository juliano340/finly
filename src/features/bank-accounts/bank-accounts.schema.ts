import { z } from "zod"

export const bankAccountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80),
  institution: z.string().max(80).optional().nullable(),
  type: z.enum(["CHECKING", "SAVINGS", "DIGITAL", "CASH", "INVESTMENT"]).default("CHECKING"),
  color: z.string().default("#22C55E"),
  initialBalance: z.coerce.number().default(0),
  active: z.coerce.boolean().default(true),
})

export const bankAccountMovementSchema = z.object({
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(160).optional().nullable(),
  date: z.coerce.date().default(() => new Date()),
})

export const bankAccountAdjustmentSchema = z.object({
  targetBalance: z.coerce.number(),
  description: z.string().max(160).optional().nullable(),
  date: z.coerce.date().default(() => new Date()),
})

export type BankAccountInput = z.infer<typeof bankAccountSchema>
export type BankAccountMovementInput = z.infer<typeof bankAccountMovementSchema>
export type BankAccountAdjustmentInput = z.infer<typeof bankAccountAdjustmentSchema>
