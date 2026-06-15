import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import { ensureFinancialMonth } from "@/features/financial-months/financial-months.service"
import { ensureFixedCostOccurrences } from "@/features/monthly-closing/monthly-closing.service"

export type DueNotificationStatus = "OVERDUE" | "DUE_TODAY" | "DUE_SOON"

export interface DueNotification {
  id: string
  type: "INVOICE" | "FIXED_COST"
  title: string
  amount: number
  dueDate: string
  daysUntilDue: number
  status: DueNotificationStatus
  href: string
}

export async function getDueSoonNotifications(
  userId: string,
  daysAhead = 7,
  client?: PrismaClient,
  now = new Date()
) {
  const db = client ?? defaultPrisma
  const today = startOfDay(now)
  const endDate = addDays(today, daysAhead)
  const months = monthsBetween(today, endDate)

  for (const month of months) {
    const financialMonth = await ensureFinancialMonth(userId, month, db)
    await ensureFixedCostOccurrences(userId, month, financialMonth.id, db)
  }

  const [invoices, occurrences] = await Promise.all([
    db.cardInvoice.findMany({
      where: {
        userId,
        status: "PENDING",
        dueDate: { lte: endOfDay(endDate) },
      },
      include: { card: true },
    }),
    db.fixedCostOccurrence.findMany({
      where: {
        userId,
        status: "PENDING",
        fixedCost: { dueDay: { not: null } },
      },
      include: { fixedCost: true },
    }),
  ])

  const invoiceNotifications = invoices.map((invoice) => {
    const dueDate = startOfDay(invoice.dueDate)
    const daysUntilDue = differenceInDays(today, dueDate)
    return {
      id: invoice.id,
      type: "INVOICE" as const,
      title: `Fatura ${invoice.card.name}`,
      amount: invoice.amount,
      dueDate: dueDate.toISOString(),
      daysUntilDue,
      status: notificationStatus(daysUntilDue),
      href: "/invoices",
    }
  })

  const fixedCostNotifications = occurrences.flatMap((occurrence) => {
    if (!occurrence.fixedCost.dueDay) return []
    const dueDate = fixedCostDueDate(occurrence.month, occurrence.fixedCost.dueDay)
    if (dueDate > endOfDay(endDate)) return []
    const daysUntilDue = differenceInDays(today, dueDate)
    return [{
      id: occurrence.id,
      type: "FIXED_COST" as const,
      title: occurrence.fixedCost.name,
      amount: occurrence.amount,
      dueDate: dueDate.toISOString(),
      daysUntilDue,
      status: notificationStatus(daysUntilDue),
      href: "/fixed-costs",
    }]
  })

  return [...invoiceNotifications, ...fixedCostNotifications]
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status) || a.daysUntilDue - b.daysUntilDue)
}

function fixedCostDueDate(month: string, dueDay: number) {
  const [year, monthIndex] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate()
  return startOfDay(new Date(Date.UTC(year, monthIndex - 1, Math.min(dueDay, lastDay))))
}

function notificationStatus(daysUntilDue: number): DueNotificationStatus {
  if (daysUntilDue < 0) return "OVERDUE"
  if (daysUntilDue === 0) return "DUE_TODAY"
  return "DUE_SOON"
}

function statusPriority(status: DueNotificationStatus) {
  if (status === "OVERDUE") return 0
  if (status === "DUE_TODAY") return 1
  return 2
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function differenceInDays(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

function monthsBetween(start: Date, end: Date) {
  const months: string[] = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
  while (cursor <= last) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}
