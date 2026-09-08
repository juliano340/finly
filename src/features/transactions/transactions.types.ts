export type TransactionWithRelations = {
  id: string
  amount: number
  type: "INCOME" | "EXPENSE"
  status: "ACTIVE" | "REVERSED"
  description: string | null
  date: Date
  categoryId: string
  bankAccountId: string | null
  userId: string
  category: { id: string; name: string; color: string; icon: string }
  bankAccount: { id: string; name: string; color: string; institution: string | null } | null
  invoiceItem: {
    invoiceId: string
    invoice: { month: string; card: { id: string; name: string; color: string } }
  } | null
}
