import { z } from "zod"

export const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(60),
  brand: z.string().max(40).optional().nullable(),
  color: z.string().default("#22C55E"),
  closingDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
})

export type CardInput = z.infer<typeof cardSchema>
