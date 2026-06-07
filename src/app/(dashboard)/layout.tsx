"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Tags,
  ArrowRightLeft,
  PiggyBank,
  Upload,
  Settings,
  ChevronLeft,
  Menu,
  Bell,
  LogOut,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/budgets", label: "Orçamentos", icon: PiggyBank },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status } = useSession()
  const [collapsed, setCollapsed] = useState(false)

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
          <div className="flex items-center gap-3">
            <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
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
