import { isBenefitAdjustment } from "@/features/bank-accounts/benefit"
import { sumMoney } from "@/lib/money"
import { dayKey, utcDayStart, type ExpenseEvolutionItem } from "./expense-evolution"

export interface BenefitEvolutionAccount {
  initialBalance: number
  movements: { date: Date; amount: number; type: "INCOME" | "EXPENSE"; description?: string | null }[]
}

export interface BenefitEvolutionPoint {
  date: string
  daily: number
  balance: number
  items: ExpenseEvolutionItem[]
  itemsTotal: number
}

export interface BenefitEvolution {
  points: BenefitEvolutionPoint[]
  credited: number
  spent: number
  currentBalance: number
  averageDaily: number
  movementEnd: string | null
  creditStart: string | null
}

const DAY_IN_MS = 86_400_000

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildBenefitEvolution(
  accounts: BenefitEvolutionAccount[],
  window: { start: Date; end: Date; creditStart?: string | null },
): BenefitEvolution {
  if (accounts.length === 0) {
    return { points: [], credited: 0, spent: 0, currentBalance: 0, averageDaily: 0, movementEnd: null, creditStart: null }
  }

  const start = utcDayStart(window.start)
  const end = utcDayStart(window.end)
  const startKey = dayKey(start)
  const endKey = dayKey(end)

  let credited = 0
  let spent = 0
  let openingBalance = sumMoney(accounts.map((account) => account.initialBalance))
  let currentBalance = openingBalance
  let movementEndKey: string | null = null
  const dailyByDay = new Map<string, number>()
  const balanceByDay = new Map<string, number>()
  const itemsByDay = new Map<string, ExpenseEvolutionItem[]>()

  for (const account of accounts) {
    for (const movement of account.movements) {
      const key = dayKey(movement.date)
      const signed = movement.type === "INCOME" ? movement.amount : -movement.amount

      currentBalance = sumMoney([currentBalance, signed])

      if (key < startKey) {
        openingBalance = sumMoney([openingBalance, signed])
        continue
      }
      if (key > endKey) continue

      if (!movementEndKey || key > movementEndKey) movementEndKey = key

      balanceByDay.set(key, sumMoney([balanceByDay.get(key) ?? 0, signed]))
      if (isBenefitAdjustment(movement.description)) continue

      if (movement.type === "INCOME") {
        credited = sumMoney([credited, movement.amount])
      } else {
        spent = sumMoney([spent, movement.amount])
        dailyByDay.set(key, sumMoney([dailyByDay.get(key) ?? 0, movement.amount]))
        const items = itemsByDay.get(key) ?? []
        items.push({ description: movement.description ?? "Compra", amount: movement.amount })
        itemsByDay.set(key, items)
      }
    }
  }

  const points: BenefitEvolutionPoint[] = []
  let balance = openingBalance
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_IN_MS) {
    const key = dayKey(new Date(time))
    balance = sumMoney([balance, balanceByDay.get(key) ?? 0])
    const dayItems = [...(itemsByDay.get(key) ?? [])].sort((a, b) => b.amount - a.amount)
    points.push({ date: key, daily: dailyByDay.get(key) ?? 0, balance, items: dayItems.slice(0, 4), itemsTotal: dayItems.length })
  }

  const movementDays = movementEndKey
    ? Math.round((new Date(`${movementEndKey}T00:00:00.000Z`).getTime() - start.getTime()) / DAY_IN_MS) + 1
    : points.length
  const averageDaily = movementDays > 0 ? roundMoney(spent / movementDays) : 0

  return {
    points,
    credited,
    spent,
    currentBalance,
    averageDaily,
    movementEnd: movementEndKey,
    creditStart: window.creditStart ?? null,
  }
}
