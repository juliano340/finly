"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  LayoutDashboard,
  Tags,
  ArrowRightLeft,
  CalendarCheck,
  CalendarRange,
  CreditCard,
  Landmark,
  Repeat,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Bell,
  LogOut,
  User as UserIcon,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { computeDaysUntilDue, deriveStatus, type DueNotificationStatus } from "@/lib/compute-days-until-due"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monthly-plan", label: "Plano do Mês", icon: CalendarRange },
  { href: "/monthly-closing", label: "Fechamento Mensal", icon: CalendarCheck },
  { href: "/bank-accounts", label: "Contas e Benefícios", icon: Landmark },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/fixed-costs", label: "Lançamentos Fixos", icon: Repeat },
  { href: "/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/settings", label: "Configurações", icon: Settings },
]

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<DueNotification[]>([])
  const [notified, setNotified] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const [bellPos, setBellPos] = useState<{ top: number; right: number } | null>(null)

  const handleLogout = () => {
    setLogoutOpen(false)
    signOut({ callbackUrl: "/login", redirect: true })
  }

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [notificationsOpen])

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)")
    const closeMobileNav = () => setMobileNavOpen(false)
    desktopQuery.addEventListener("change", closeMobileNav)
    return () => desktopQuery.removeEventListener("change", closeMobileNav)
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false)
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [mobileNavOpen])

  const fetchNotifications = () => {
    return fetch("/api/notifications/due-soon")
      .then((res) => res.ok ? res.json() : [])
      .then((data: RawDueNotification[]) => {
        const enriched: DueNotification[] = data.map((item) => {
          const daysUntilDue = computeDaysUntilDue(item.dueDate)
          return { ...item, daysUntilDue, status: deriveStatus(daysUntilDue) }
        })
        setNotifications(enriched)
      })
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
    const timer = window.setTimeout(() => setNotified(true), 0)
    return () => window.clearTimeout(timer)
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

  const renderNavigation = (isCollapsed: boolean, onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const isActive = item.href === "/cards" ? pathname.startsWith("/cards") || pathname.startsWith("/invoices") : pathname === item.href
        const sharedMonth = searchParams.get("month")
        const href = sharedMonth ? `${item.href}?month=${encodeURIComponent(sharedMonth)}` : item.href
        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            } ${isCollapsed ? "justify-center px-2" : ""}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && item.label}
          </Link>
        )
      })}
    </nav>
  )

  const renderLogout = (isCollapsed: boolean, onClick?: () => void) => (
    <div className="p-2">
      <Separator className="bg-sidebar-border" />
      <button
        type="button"
        onClick={() => { onClick?.(); setLogoutOpen(true) }}
        className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${
          isCollapsed ? "justify-center px-2" : ""
        }`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!isCollapsed && "Sair"}
      </button>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden bg-sidebar-background text-sidebar-foreground transition-[width] duration-300 ease-in-out md:flex ${collapsed ? "w-16" : "w-56"}`}
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
            type="button"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
            className={`ml-auto rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? (
              <Menu className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <Separator className="bg-sidebar-border" />
        {renderNavigation(collapsed)}
        {renderLogout(collapsed)}
      </aside>

      {/* Mobile drawer */}
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={() => setMobileNavOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!mobileNavOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden bg-sidebar-background text-sidebar-foreground shadow-xl transition-transform duration-300 ease-out md:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="font-semibold tracking-tight">Finly</span>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
            className="ml-auto rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <Separator className="bg-sidebar-border" />
        {renderNavigation(false, () => setMobileNavOpen(false))}
        {renderLogout(false, () => setMobileNavOpen(false))}
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="mr-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 className="truncate text-sm font-medium text-muted-foreground">
              {navItems.find((i) => i.href === pathname)?.label ?? ""}
            </h2>
          </div>
          <div className="relative flex items-center gap-3">
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  if (!notificationsOpen) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setBellPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                    fetchNotifications()
                  }
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
              {notificationsOpen && bellPos && (
                <div className="fixed z-[9999] w-80 overflow-hidden rounded-xl border bg-background shadow-lg" style={{ top: bellPos.top, right: bellPos.right }}>
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
            </div>
            <AvatarMenu
              name={session?.user?.name ?? null}
              email={session?.user?.email ?? null}
              onLogout={() => setLogoutOpen(true)}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div key={pathname} className="dashboard-page-transition">
            {children}
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sair da conta"
        description="Tem certeza que deseja sair?"
        confirmText="Sair"
        onConfirm={handleLogout}
      />
    </div>
  )
}

function notificationLabel(item: DueNotification) {
  if (item.status === "OVERDUE") return item.daysUntilDue === -1 ? "Atrasada há 1 dia" : `Atrasada há ${Math.abs(item.daysUntilDue)} dias`
  if (item.status === "DUE_TODAY") return "Vence hoje"
  return item.daysUntilDue === 1 ? "Vence amanhã" : `Vence em ${item.daysUntilDue} dias`
}

function AvatarMenu({ name, email, onLogout }: { name: string | null; email: string | null; onLogout: () => void }) {
  const initials = (name ?? email ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-medium text-foreground">{name ?? "Sem nome"}</span>
          <span className="text-xs text-muted-foreground">{email ?? ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={(props) => (
            <Link href="/settings" {...props} className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Perfil
            </Link>
          )}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
