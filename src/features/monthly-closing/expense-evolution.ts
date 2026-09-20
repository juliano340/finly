import { sumMoney } from "@/lib/money"

export interface ExpenseEvolutionInvoice {
  effectiveTotal: number
  dueDate: Date
  importedTransactions: {
    date: Date | null
    amount: number
    type: string | null
    description: string
  }[]
  items: { amount: number; date: Date | null; description: string }[]
  unlinkedFixedOccurrences: { amount: number; date: Date | null; description: string }[]
}

export interface ExpenseEvolutionInput {
  invoices: ExpenseEvolutionInvoice[]
  outsideCardOccurrences: { amount: number; date: Date; description: string }[]
  looseExpenses: { amount: number; date: Date; description: string | null }[]
  benefitAccounts: {
    initialBalance: number
    movements: { date: Date; amount: number; type: "INCOME" | "EXPENSE" }[]
  }[]
}

export interface ExpenseEvolutionItem {
  description: string
  amount: number
}

export interface ExpenseEvolutionPoint {
  date: string
  daily: number
  cumulative: number
  benefitBalance: number | null
  items: ExpenseEvolutionItem[]
  itemsTotal: number
}

export interface ExpenseEvolution {
  points: ExpenseEvolutionPoint[]
  total: number
  expenseCount: number
  periodStart: string | null
  periodEnd: string | null
  hasBenefit: boolean
}

export function dayKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function buildExpenseEvolution(input: ExpenseEvolutionInput): ExpenseEvolution {
  const hasBenefit = input.benefitAccounts.length > 0
  const dailyByDay = new Map<string, number>()
  const itemsByDay = new Map<string, ExpenseEvolutionItem[]>()
  let minTime = Infinity
  let maxTime = -Infinity
  let expenseCount = 0

  function addEvent(date: Date, amount: number, description: string) {
    const key = dayKey(date)
    dailyByDay.set(key, sumMoney([dailyByDay.get(key) ?? 0, amount]))
    const items = itemsByDay.get(key) ?? []
    items.push({ description, amount })
    itemsByDay.set(key, items)
    const time = date.getTime()
    if (time < minTime) minTime = time
    if (time > maxTime) maxTime = time
    expenseCount += 1
  }

  for (const invoice of input.invoices) {
    const events: { date: Date; amount: number; description: string }[] = []
    let eventsTotal = 0

    if (invoice.importedTransactions.length > 0) {
      for (const transaction of invoice.importedTransactions) {
        if (transaction.type === "credit") continue
        const amount = Math.abs(transaction.amount)
        events.push({ date: transaction.date ?? invoice.dueDate, amount, description: transaction.description })
        eventsTotal = sumMoney([eventsTotal, amount])
      }
    } else {
      for (const item of invoice.items) {
        events.push({ date: item.date ?? invoice.dueDate, amount: item.amount, description: item.description })
        eventsTotal = sumMoney([eventsTotal, item.amount])
      }
      for (const occurrence of invoice.unlinkedFixedOccurrences) {
        events.push({ date: occurrence.date ?? invoice.dueDate, amount: occurrence.amount, description: occurrence.description })
        eventsTotal = sumMoney([eventsTotal, occurrence.amount])
      }
    }

    for (const event of events) addEvent(event.date, event.amount, event.description)

    const adjustment = sumMoney([invoice.effectiveTotal, -eventsTotal])
    if (Math.abs(adjustment) >= 0.005) addEvent(invoice.dueDate, adjustment, "Ajuste da fatura")
  }

  for (const occurrence of input.outsideCardOccurrences) {
    addEvent(occurrence.date, occurrence.amount, occurrence.description)
  }
  for (const expense of input.looseExpenses) {
    addEvent(expense.date, expense.amount, expense.description ?? "Despesa")
  }

  if (expenseCount === 0) {
    return { points: [], total: 0, expenseCount: 0, periodStart: null, periodEnd: null, hasBenefit }
  }

  const start = utcDayStart(new Date(minTime))
  const end = utcDayStart(new Date(maxTime))
  const startKey = dayKey(start)
  const endKey = dayKey(end)

  const benefitByDay = new Map<string, number>()
  let benefitOpening = sumMoney(input.benefitAccounts.map((account) => account.initialBalance))
  for (const account of input.benefitAccounts) {
    for (const movement of account.movements) {
      const key = dayKey(movement.date)
      const signed = movement.type === "INCOME" ? movement.amount : -movement.amount
      if (key < startKey) {
        benefitOpening = sumMoney([benefitOpening, signed])
      } else if (key <= endKey) {
        benefitByDay.set(key, sumMoney([benefitByDay.get(key) ?? 0, signed]))
      }
    }
  }

  const points: ExpenseEvolutionPoint[] = []
  let cumulative = 0
  let benefitBalance = benefitOpening
  for (let time = start.getTime(); time <= end.getTime(); time += 86_400_000) {
    const key = dayKey(new Date(time))
    const daily = dailyByDay.get(key) ?? 0
    cumulative = sumMoney([cumulative, daily])
    benefitBalance = sumMoney([benefitBalance, benefitByDay.get(key) ?? 0])
    const dayItems = [...(itemsByDay.get(key) ?? [])].sort((a, b) => b.amount - a.amount)
    points.push({
      date: key,
      daily,
      cumulative,
      benefitBalance: hasBenefit ? benefitBalance : null,
      items: dayItems.slice(0, 4),
      itemsTotal: dayItems.length,
    })
  }

  return {
    points,
    total: cumulative,
    expenseCount,
    periodStart: points[0].date,
    periodEnd: points[points.length - 1].date,
    hasBenefit,
  }
}
