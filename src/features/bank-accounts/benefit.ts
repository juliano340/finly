export interface BenefitAccountInfo {
  benefitDailyRate: number | null
  movements: { amount: number; type: "INCOME" | "EXPENSE" }[]
}

export interface BenefitTotals {
  credited: number
  spent: number
  estimated: boolean
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
