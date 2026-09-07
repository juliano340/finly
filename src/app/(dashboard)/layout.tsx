"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
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
  LogOut,
  User as UserIcon,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { NotificationBell } from "@/features/notifications/notifications-panel"
import { CURRENT_VERSION } from "@/content/releases"

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
  const [logoutOpen, setLogoutOpen] = useState(false)

  const handleLogout = () => {
    setLogoutOpen(false)
    signOut({ callbackUrl: "/login", redirect: true })
  }

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

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

  const renderVersion = (isCollapsed: boolean, onNavigate?: () => void) => (
    <div className="px-2 pb-1">
      <Link
        href="/changelog"
        onClick={onNavigate}
        aria-label={`Versão ${CURRENT_VERSION}. Abrir changelog`}
        title={`Finly v${CURRENT_VERSION}`}
        className={`block rounded-md px-2 py-1 text-center text-[10px] font-medium text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${
          isCollapsed ? "tracking-tight" : "tracking-wide"
        }`}
      >
        v{CURRENT_VERSION}
      </Link>
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
        {renderVersion(collapsed)}
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
        {renderVersion(false, () => setMobileNavOpen(false))}
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
            <NotificationBell />
            <AvatarMenu
              name={session?.user?.name ?? null}
              email={session?.user?.email ?? null}
              image={session?.user?.image ?? null}
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

function AvatarMenu({ name, email, image, onLogout }: { name: string | null; email: string | null; image: string | null; onLogout: () => void }) {
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
          {image && <AvatarImage src={image} alt={name ?? email ?? "Usuário"} />}
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
