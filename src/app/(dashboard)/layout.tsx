"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  LayoutDashboard,
  Tags,
  ArrowRightLeft,
  CalendarCheck,
  CreditCard,
  Landmark,
  Receipt,
  Repeat,
  Settings,
  ChevronLeft,
  Menu,
  Bell,
  LogOut,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, formatDate } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monthly-closing", label: "Fechamento Mensal", icon: CalendarCheck },
  { href: "/bank-accounts", label: "Contas Bancárias", icon: Landmark },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/invoices", label: "Faturas", icon: Receipt },
  { href: "/fixed-costs", label: "Custos Fixos", icon: Repeat },
  { href: "/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/settings", label: "Configurações", icon: Settings },
]

interface DueNotification {
  id: string
  type: "INVOICE" | "FIXED_COST"
  title: string
  amount: number
  dueDate: string
  daysUntilDue: number
  status: "OVERDUE" | "DUE_TODAY" | "DUE_SOON"
  href: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<DueNotification[]>([])
  const [notified, setNotified] = useState(false)

  const fetchNotifications = () => {
    return fetch("/api/notifications/due-soon")
      .then((res) => res.ok ? res.json() : [])
      .then((data: DueNotification[]) => setNotifications(data))
      .catch(() => setNotifications([]))
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetchNotifications()
  }, [status, pathname])

  useEffect(() => {
    if (notified || notifications.length === 0) return
    const overdue = notifications.filter((item) => item.status === "OVERDUE").length
    const dueToday = notifications.filter((item) => item.status === "DUE_TODAY").length
    if (overdue > 0) toast.warning(`Você tem ${overdue} ${overdue === 1 ? "conta atrasada" : "contas atrasadas"}`)
    else if (dueToday > 0) toast.info(`Você tem ${dueToday} ${dueToday === 1 ? "conta vencendo hoje" : "contas vencendo hoje"}`)
    setNotified(true)
  }, [notifications, notified])

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#1E3B4A] text-white transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          {!collapsed && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">F</span>
              </div>
              <span className="font-semibold tracking-tight">Finly</span>
            </>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`ml-auto rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        <Separator className="bg-white/10" />
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-2">
          <Separator className="bg-white/10" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-2" : ""
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-white px-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            {navItems.find((i) => i.href === pathname)?.label ?? ""}
          </h2>
          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!notificationsOpen) fetchNotifications()
                setNotificationsOpen((open) => !open)
              }}
              className="relative rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-10 top-9 z-50 w-80 overflow-hidden rounded-xl border bg-background shadow-lg">
                <div className="border-b p-3">
                  <p className="text-sm font-semibold">Lembretes</p>
                  <p className="text-xs text-muted-foreground">Contas próximas do vencimento</p>
                </div>
                <div className="max-h-96 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Nenhuma conta próxima do vencimento.</p>
                  ) : notifications.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.href}
                      onClick={() => setNotificationsOpen(false)}
                      className="block rounded-lg p-3 text-sm transition-colors hover:bg-muted"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{notificationLabel(item)} · {formatDate(item.dueDate)}</p>
                        </div>
                        <p className="shrink-0 font-semibold">{formatCurrency(item.amount)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                U
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}

function notificationLabel(item: DueNotification) {
  if (item.status === "OVERDUE") return item.daysUntilDue === -1 ? "Atrasada há 1 dia" : `Atrasada há ${Math.abs(item.daysUntilDue)} dias`
  if (item.status === "DUE_TODAY") return "Vence hoje"
  return item.daysUntilDue === 1 ? "Vence amanhã" : `Vence em ${item.daysUntilDue} dias`
}
