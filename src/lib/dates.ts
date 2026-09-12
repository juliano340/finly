export function todayIso() {
  return new Date().toISOString().split("T")[0]
}

export function toIsoDate(value: Date | string) {
  return new Date(value).toISOString().split("T")[0]
}

export function formatIsoDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")
}

export function dueDateIsoForMonth(dueDay: number | null, month: string): string | null {
  if (!dueDay) return null
  const [year, monthNumber] = month.split("-").map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const day = Math.min(dueDay, lastDay)
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
