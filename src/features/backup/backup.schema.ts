import { z } from "zod"

const isoDate = z.string().transform((val, ctx) => {
  const d = new Date(val)
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida" })
    return z.NEVER
  }
  return d
})

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: isoDate,
  data: z.object({
    categories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      icon: z.string().default("wallet"),
      color: z.string().default("#0EA882"),
      type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
    })),
    financialMonths: z.array(z.object({
      id: z.string(),
      month: z.string(),
      status: z.enum(["OPEN", "CLOSED"]).default("OPEN"),
    })),
    bankAccounts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      institution: z.string().nullable().optional(),
      type: z.enum(["CHECKING", "SAVINGS", "DIGITAL", "CASH", "INVESTMENT", "BENEFIT"]).default("CHECKING"),
      color: z.string().default("#22C55E"),
      initialBalance: z.number().default(0),
      overdraftLimit: z.number().default(0),
      benefitDailyRate: z.number().positive().nullable().optional(),
      active: z.boolean().default(true),
    })),
    cards: z.array(z.object({
      id: z.string(),
      name: z.string(),
      brand: z.string().nullable().optional(),
      color: z.string().default("#22C55E"),
      closingDay: z.number().int().nullable().optional(),
      dueDay: z.number().int().nullable().optional(),
      bankAccountId: z.string().nullable().optional(),
    })),
    transactions: z.array(z.object({
      id: z.string(),
      amount: z.number(),
      type: z.enum(["INCOME", "EXPENSE"]),
      description: z.string().nullable().optional(),
      date: isoDate,
      categoryId: z.string(),
    })),
    budgets: z.array(z.object({
      id: z.string(),
      amount: z.number(),
      month: z.string(),
      categoryId: z.string(),
    })),
    bankAccountMovements: z.array(z.object({
      id: z.string(),
      bankAccountId: z.string(),
      amount: z.number(),
      type: z.enum(["INCOME", "EXPENSE"]),
      description: z.string().nullable().optional(),
      date: isoDate,
    })),
    fixedCosts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
      defaultAmount: z.number(),
      categoryId: z.string(),
      paymentMethod: z.enum(["PIX", "BANK_SLIP", "DEBIT", "CREDIT_CARD", "CASH"]),
      dueDay: z.number().int().nullable().optional(),
      paidInsideCard: z.boolean().default(false),
      cardId: z.string().nullable().optional(),
      bankAccountId: z.string().nullable().optional(),
      active: z.boolean().default(true),
      startDate: isoDate.optional(),
      frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM"]).optional(),
      customInterval: z.number().int().nullable().optional(),
      customUnit: z.enum(["DAYS", "WEEKS", "MONTHS", "YEARS"]).nullable().optional(),
      endType: z.enum(["NONE", "DATE", "COUNT"]).optional(),
      endDate: isoDate.nullable().optional(),
      endAfterCount: z.number().int().nullable().optional(),
    })),
    cardInvoices: z.array(z.object({
      id: z.string(),
      cardId: z.string(),
      financialMonthId: z.string(),
      month: z.string(),
      dueDate: isoDate,
      amount: z.number(),
      status: z.enum(["PENDING", "PAID"]).default("PENDING"),
      calculationMode: z.enum(["CALCULATED", "ENTERED_TOTAL"]).default("ENTERED_TOTAL"),
      lifecycleStatus: z.enum(["ESTIMATED", "OPEN", "CLOSED", "PAID"]).default("OPEN"),
      enteredTotal: z.number().nullable().optional(),
      closedAt: isoDate.nullable().optional(),
      paidAt: isoDate.nullable().optional(),
      paymentMethod: z.string().nullable().optional(),
      paymentBankAccountId: z.string().nullable().optional(),
      bankAccountMovementId: z.string().nullable().optional(),
    })),
    fixedCostOccurrences: z.array(z.object({
      id: z.string(),
      fixedCostId: z.string(),
      financialMonthId: z.string(),
      month: z.string(),
      dueDate: isoDate.optional().nullable(),
      amount: z.number(),
      status: z.enum(["PENDING", "PAID"]).default("PENDING"),
      paidAt: isoDate.nullable().optional(),
    })),
    cardInvoiceItems: z.array(z.object({
      id: z.string(),
      invoiceId: z.string(),
      kind: z.enum(["MANUAL", "INSTALLMENT", "FIXED_COST", "IMPORTED", "FORECAST"]),
      postingStatus: z.enum(["PROJECTED", "POSTED"]),
      description: z.string(),
      amount: z.number(),
      fixedCostOccurrenceId: z.string().nullable().optional(),
      transactionId: z.string().nullable().optional(),
      installmentGroupId: z.string().nullable().optional(),
      installmentNumber: z.number().int().nullable().optional(),
      installmentCount: z.number().int().nullable().optional(),
    })).default([]),
  }),
})

export type BackupData = z.infer<typeof backupSchema>
export type ImportMode = "replace" | "merge"
