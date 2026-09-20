export interface BenefitAccountInfo {
  benefitDailyRate: number | null
  movements: { amount: number; type: "INCOME" | "EXPENSE"; description?: string | null }[]
}

export interface BenefitTotals {
  credited: number
  spent: number
  estimated: boolean
}

export function isBenefitAdjustment(description?: string | null): boolean {
  return (description ?? "").trim().toLowerCase().startsWith("ajuste")
}

export interface BenefitRechargeSummary {
  total12m: number
  count12m: number
  average: number
  averageIntervalDays: number | null
}

const DAY_IN_MS = 86_400_000

function toUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function summarizeRecharges(recharges: { date: Date | string; amount: number }[], today: Date): BenefitRechargeSummary {
  const todayUtc = toUtcDay(today)
  const cutoff = new Date(todayUtc)
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1)
  const cutoffUtc = cutoff.getTime()

  const within = recharges
    .map((recharge) => ({ day: toUtcDay(new Date(recharge.date)), amount: recharge.amount }))
    .filter((recharge) => recharge.day >= cutoffUtc && recharge.day <= todayUtc)

  const total12m = roundMoney(within.reduce((total, recharge) => total + recharge.amount, 0))
  const count12m = within.length
  const average = count12m > 0 ? roundMoney(total12m / count12m) : 0

  let averageIntervalDays: number | null = null
  if (count12m >= 2) {
    const days = within.map((recharge) => recharge.day).sort((a, b) => a - b)
    let totalGap = 0
    for (let i = 1; i < days.length; i += 1) totalGap += (days[i] - days[i - 1]) / DAY_IN_MS
    averageIntervalDays = roundMoney(totalGap / (days.length - 1))
  }

  return { total12m, count12m, average, averageIntervalDays }
}

export function businessDaysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  let businessDays = 0
  for (let day = 1; day <= lastDay; day += 1) {
    const weekDay = new Date(year, monthNumber - 1, day).getDay()
    if (weekDay !== 0 && weekDay !== 6) businessDays += 1
  }
  return businessDays
}

export function estimateBenefitCredit(dailyRate: number, month: string): number {
  return roundMoney(dailyRate * businessDaysInMonth(month))
}

export function computeBenefitTotals(accounts: BenefitAccountInfo[], month: string): BenefitTotals {
  let credited = 0
  let spent = 0
  let estimated = false

  for (const account of accounts) {
    let hasCredit = false
    for (const movement of account.movements) {
      if (isBenefitAdjustment(movement.description)) continue
      if (movement.type === "INCOME") {
        credited += movement.amount
        hasCredit = true
      } else {
        spent += movement.amount
      }
    }
    if (!hasCredit && account.benefitDailyRate != null && account.benefitDailyRate > 0) {
      credited += estimateBenefitCredit(account.benefitDailyRate, month)
      estimated = true
    }
  }

  return { credited: roundMoney(credited), spent: roundMoney(spent), estimated }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
