"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Bell, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { formatCurrency, formatDate } from "@/lib/utils"
import { computeDaysUntilDue, deriveStatus, type DueNotificationStatus } from "@/lib/compute-days-until-due"

interface RawDueNotification {
  id: string
  type: "INVOICE" | "FIXED_COST"
  title: string
  amount: number
  dueDate: string
  href: string
}

interface DueNotification extends RawDueNotification {
  daysUntilDue: number
  status: DueNotificationStatus
}

function notificationLabel(item: DueNotification) {
  if (item.status === "OVERDUE") return item.daysUntilDue === -1 ? "Atrasada há 1 dia" : `Atrasada há ${Math.abs(item.daysUntilDue)} dias`
  if (item.status === "DUE_TODAY") return "Vence hoje"
  return item.daysUntilDue === 1 ? "Vence amanhã" : `Vence em ${item.daysUntilDue} dias`
}

function fetchNotifications(): Promise<{ daysAhead: number; notifications: DueNotification[] }> {
  return fetch("/api/notifications/due-soon")
    .then((res) => (res.ok ? res.json() : { daysAhead: 7, notifications: [] }))
    .then((data: { daysAhead: number; notifications: RawDueNotification[] }) => ({
      daysAhead: data.daysAhead,
      notifications: data.notifications.map((item) => {
        const daysUntilDue = computeDaysUntilDue(item.dueDate)
        return { ...item, daysUntilDue, status: deriveStatus(daysUntilDue) }
      }),
    }))
    .catch(() => ({ daysAhead: 7, notifications: [] }))
}

const ALERT_AUTO_HIDE_MS = 10_000

export function NotificationBell() {
  const pathname = usePathname()
  const { status } = useSession()
  const [open, setOpen] = useState(false)
  const [daysAhead, setDaysAhead] = useState(7)
  const [notifications, setNotifications] = useState<DueNotification[]>([])
  const [dismissedLabel, setDismissedLabel] = useState<string | null>(null)

  // Fetch on mount + on navigation (same as original: [status, pathname])
  useEffect(() => {
    if (status !== "authenticated") return
    fetchNotifications().then((data) => {
      setDaysAhead(data.daysAhead)
      setNotifications(data.notifications)
    })
  }, [status, pathname])

  const handleOpen = () => {
    if (!open) {
      fetchNotifications().then((data) => {
        setDaysAhead(data.daysAhead)
        setNotifications(data.notifications)
      })
    }
    setOpen((v) => !v)
  }

  const overdueCount = notifications.filter((n) => n.status === "OVERDUE").length
  const dueTodayCount = notifications.filter((n) => n.status === "DUE_TODAY").length
  const alertLabel =
    overdueCount > 0
      ? `${overdueCount} ${overdueCount === 1 ? "atrasada" : "atrasadas"}`
      : dueTodayCount === 1
        ? "1 vence hoje"
        : `${dueTodayCount} vencem hoje`
  const alertDescription =
    overdueCount > 0
      ? `${overdueCount} ${overdueCount === 1 ? "conta atrasada" : "contas atrasadas"}`
      : `${dueTodayCount} ${dueTodayCount === 1 ? "conta vence hoje" : "contas vencem hoje"}`
  const hasAlert = overdueCount > 0 || dueTodayCount > 0
  const showAlert = hasAlert && alertDescription !== dismissedLabel

  useEffect(() => {
    if (!showAlert) return
    const timer = setTimeout(() => setDismissedLabel(alertDescription), ALERT_AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [showAlert, alertDescription])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>
      {showAlert && (
        <div
          role="status"
          className={`fixed left-1/2 top-16 z-40 flex -translate-x-1/2 items-center rounded-full border pl-3 pr-1 shadow-sm ${
            overdueCount > 0
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-warning/40 bg-warning/10 text-warning"
          }`}
        >
          <button
            type="button"
            onClick={handleOpen}
            aria-label={`${alertDescription}. Abrir lembretes`}
            className="flex h-8 items-center gap-2 text-xs font-semibold"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${
                  overdueCount > 0 ? "bg-destructive" : "bg-warning"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  overdueCount > 0 ? "bg-destructive" : "bg-warning"
                }`}
              />
            </span>
            {alertLabel}
          </button>
          <button
            type="button"
            onClick={() => setDismissedLabel(alertDescription)}
            aria-label="Fechar aviso"
            className="ml-1 flex size-6 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
      <NotificationsSheet
        open={open}
        onOpenChange={setOpen}
        daysAhead={daysAhead}
        notifications={notifications}
      />
    </>
  )
}

function NotificationsSheet({
  open,
  onOpenChange,
  daysAhead,
  notifications,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  daysAhead: number
  notifications: DueNotification[]
}) {

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Lembretes</SheetTitle>
          <SheetDescription>
            Contas que vencem em até {daysAhead} {daysAhead === 1 ? "dia" : "dias"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma conta próxima do vencimento.
            </p>
          ) : (
            <div className="space-y-1">
              {notifications.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-lg p-3 text-sm transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {notificationLabel(item)} · {formatDate(item.dueDate)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
