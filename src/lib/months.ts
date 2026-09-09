export const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  return `${MONTH_ABBR[monthNumber - 1]} ${year}`
}

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function changeMonth(month: string, amount: -1 | 1) {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export function formatMonthDistance(month: string, todayMonth: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const [todayYear, todayMonthNumber] = todayMonth.split("-").map(Number)
  const distance = (year - todayYear) * 12 + monthNumber - todayMonthNumber
  const absoluteDistance = Math.abs(distance)

  if (absoluteDistance === 1) return distance < 0 ? "mês anterior" : "próximo mês"
  return distance < 0 ? `${absoluteDistance} meses atrás` : `em ${absoluteDistance} meses`
}
