"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
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

export function NotificationBell() {
  const pathname = usePathname()
  const { status } = useSession()
  const [open, setOpen] = useState(false)
  const [daysAhead, setDaysAhead] = useState(7)
  const [notifications, setNotifications] = useState<DueNotification[]>([])
  const [acknowledgedLabel, setAcknowledgedLabel] = useState<string | null>(null)

  // Fetch on mount + on navigation (same as original: [status, pathname])
  useEffect(() => {
    if (status !== "authenticated") return
    fetchNotifications().then((data) => {
      setDaysAhead(data.daysAhead)
      setNotifications(data.notifications)
    })
  }, [status, pathname])

  const overdueCount = notifications.filter((n) => n.status === "OVERDUE").length
  const dueTodayCount = notifications.filter((n) => n.status === "DUE_TODAY").length
  const alertDescription =
    overdueCount > 0
      ? `${overdueCount} ${overdueCount === 1 ? "conta atrasada" : "contas atrasadas"}`
      : `${dueTodayCount} ${dueTodayCount === 1 ? "conta vence hoje" : "contas vencem hoje"}`
  const hasAlert = overdueCount > 0 || dueTodayCount > 0
  const showAlert = hasAlert && alertDescription !== acknowledgedLabel

  const handleOpen = () => {
    setAcknowledgedLabel(alertDescription)
    if (!open) {
      fetchNotifications().then((data) => {
        setDaysAhead(data.daysAhead)
        setNotifications(data.notifications)
      })
    }
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={showAlert ? `${alertDescription}. Abrir lembretes` : "Abrir lembretes"}
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell
          className={`h-4 w-4 ${
            showAlert
              ? overdueCount > 0
                ? "animate-pulse text-destructive"
                : "animate-pulse text-warning"
              : ""
          }`}
        />
        {notifications.length > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
              showAlert
                ? overdueCount > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-warning text-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>
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
