import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { computeDaysUntilDue } from "@/lib/compute-days-until-due"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(date))
}

export function dueLabel(dueDate: string | null | undefined, now: Date = new Date()): string | null {
  if (!dueDate) return null
  const days = computeDaysUntilDue(dueDate, now)
  const formatted = formatDate(dueDate)
  if (days === 0) return "Vence hoje"
  if (days > 0) return `Vence em ${formatted}`
  return `Venceu em ${formatted}`
}

export function isOverdue(dueDate: string | null | undefined, now: Date = new Date()): boolean {
  return !!dueDate && computeDaysUntilDue(dueDate, now) < 0
}
