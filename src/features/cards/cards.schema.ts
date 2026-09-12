import { z } from "zod"

export const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(60, "Nome deve ter no máximo 60 caracteres"),
  brand: z.string().max(40, "Bandeira deve ter no máximo 40 caracteres").optional().nullable(),
  color: z.string().default("#22C55E"),
  closingDay: z.coerce
    .number()
    .int("Dia deve estar entre 1 e 31")
    .min(1, "Dia deve estar entre 1 e 31")
    .max(31, "Dia deve estar entre 1 e 31")
    .optional()
    .nullable(),
  dueDay: z.coerce
    .number()
    .int("Dia deve estar entre 1 e 31")
    .min(1, "Dia deve estar entre 1 e 31")
    .max(31, "Dia deve estar entre 1 e 31")
    .optional()
    .nullable(),
  bankAccountId: z.string().optional().nullable(),
})

export type CardInput = Omit<z.infer<typeof cardSchema>, "color"> & { color?: string }
