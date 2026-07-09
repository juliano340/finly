export type DueNotificationStatus = "OVERDUE" | "DUE_TODAY" | "DUE_SOON"

export function computeDaysUntilDue(dueDateIso: string, now: Date = new Date()): number {
  const dueYMD = dueDateIso.slice(0, 10)
  const todayYMD = localYMD(now)
  const dueLocal = new Date(`${dueYMD}T00:00:00`)
  const todayLocal = new Date(`${todayYMD}T00:00:00`)
  return Math.round((dueLocal.getTime() - todayLocal.getTime()) / 86_400_000)
}

export function deriveStatus(daysUntilDue: number): DueNotificationStatus {
  if (daysUntilDue < 0) return "OVERDUE"
  if (daysUntilDue === 0) return "DUE_TODAY"
  return "DUE_SOON"
}

function localYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}