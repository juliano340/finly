export interface BudgetWithCategory {
  id: string
  amount: number
  month: string
  categoryId: string
  userId: string
  category: {
    id: string
    name: string
    color: string
    icon: string | null
  }
}

export interface BudgetSummary {
  budgeted: number
  spent: number
  remaining: number
  percentage: number
}
