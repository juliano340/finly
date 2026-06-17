"use client"

import { useTheme } from "next-themes"

const navItems = ["Dashboard", "Fechamento", "Contas", "Cartões", "Faturas", "Transações"]

const summaryCards = [
  { label: "Receitas do mês", value: "R$ 8.500,00", tone: "green" },
  { label: "Despesas do mês", value: "R$ 3.240,00", tone: "red" },
  { label: "Resultado líquido", value: "R$ 5.260,00", tone: "green" },
]

const accountCards = [
  { label: "Saldo em contas", value: "R$ 12.480,00", caption: "Soma dos saldos bancários", active: true },
  { label: "A pagar", value: "R$ 2.135,55", caption: "Faturas + contas fixas", tone: "red" },
  { label: "Disponível", value: "R$ 10.344,45", caption: "Saldo - A pagar", tone: "green" },
  { label: "Gastos do mês", value: "R$ 3.240,00", caption: "Fatura + PIX + avulsas", tone: "red" },
]

const evolution = [48, 62, 55, 70, 64, 82]
const invoices = [34, 52, 46, 66, 58, 74]
const categories = [
  { name: "Moradia", value: "R$ 1.450", width: 86, color: "#2563EB" },
  { name: "Mercado", value: "R$ 620", width: 54, color: "#F59E0B" },
  { name: "Transporte", value: "R$ 248", width: 32, color: "#E85D5D" },
]
const transactions = [
  { name: "Salário", detail: "Receita mensal", value: "+R$ 5.200", green: true },
  { name: "Aluguel", detail: "Moradia", value: "-R$ 1.400" },
  { name: "iFood", detail: "Alimentação", value: "-R$ 89,90" },
]

export function ShowcaseMockup() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === "light"
  const pageBg = isLight ? "#F8FAFC" : "#0F172A"
  const cardBg = isLight ? "#FFFFFF" : "#111827"
  const muted = isLight ? "#64748B" : "#94A3B8"
  const text = isLight ? "#1E293B" : "#F8FAFC"
  const border = isLight ? "#E2E8F0" : "rgba(255,255,255,0.08)"

  return (
    <div className="overflow-hidden" style={{ background: pageBg }}>
      <div className="flex min-h-[520px] w-full text-left">
        <aside className="hidden w-56 shrink-0 flex-col bg-[#1E3B4A] text-white md:flex">
          <div className="flex h-14 items-center gap-3 px-4">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#22C55E] text-sm font-bold text-[#082012]">F</div>
            <span className="font-semibold tracking-tight">Finly</span>
          </div>
          <div className="h-px bg-white/10" />
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item, index) => (
              <div
                key={item}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${index === 0 ? "bg-[#22C55E] text-[#082012]" : "text-white/70"}`}
              >
                <span className="h-4 w-4 rounded bg-current/20" />
                {item}
              </div>
            ))}
          </nav>
          <div className="p-4 text-xs text-white/50">Conta demo</div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-14 items-center justify-between border-b px-5" style={{ background: cardBg, borderColor: border }}>
            <span className="text-sm font-medium" style={{ color: muted }}>Dashboard</span>
            <div className="flex items-center gap-3">
              <span className="relative h-8 w-8 rounded-lg border" style={{ borderColor: border }}>
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#22C55E]" />
              </span>
              <div className="h-8 w-8 rounded-full bg-[#22C55E]" />
            </div>
          </header>

          <main className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold tracking-tight" style={{ color: text }}>Dashboard</h3>
                <p className="text-sm" style={{ color: muted }}>Visão geral das suas finanças</p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium" style={{ color: text, borderColor: border, background: cardBg }}>
                Junho de 2026
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-2xl p-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>●</span>
                    <div>
                      <p className="text-xs font-medium" style={{ color: muted }}>{card.label}</p>
                      <p className="text-lg font-bold" style={{ color: text }}>{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              {accountCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-2xl p-4 shadow-sm ${card.active ? "bg-emerald-600 text-white" : ""}`}
                  style={card.active ? undefined : { background: cardBg, border: `1px solid ${border}` }}
                >
                  <p className="text-xs font-medium" style={card.active ? { opacity: 0.8 } : { color: muted }}>{card.label}</p>
                  <p className={`mt-1 text-lg font-bold ${card.tone === "red" ? "text-red-500" : card.tone === "green" ? "text-emerald-500" : ""}`} style={card.active ? undefined : card.tone ? undefined : { color: text }}>{card.value}</p>
                  <p className="mt-1 text-[10px]" style={card.active ? { opacity: 0.65 } : { color: muted }}>{card.caption}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl p-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold" style={{ color: text }}>Evolução mensal</p>
                    <p className="text-xs" style={{ color: muted }}>Gastos dos últimos 6 meses</p>
                  </div>
                  <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-semibold text-[#22C55E]">Total</span>
                </div>
                <div className="flex h-44 items-end gap-3">
                  {evolution.map((height, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t-lg bg-[#22C55E]" style={{ height: `${height}%`, opacity: index === evolution.length - 1 ? 1 : 0.35 }} />
                      <span className="text-[10px]" style={{ color: muted }}>{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][index]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <p className="font-semibold" style={{ color: text }}>Gastos por categoria</p>
                <div className="mt-4 space-y-4">
                  {categories.map((category) => (
                    <div key={category.name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span style={{ color: text }}>{category.name}</span>
                        <span style={{ color: muted }}>{category.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full" style={{ background: isLight ? "#E2E8F0" : "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${category.width}%`, background: category.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl p-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <p className="font-semibold" style={{ color: text }}>Evolução das faturas</p>
                <div className="mt-4 flex h-28 items-end gap-2">
                  {invoices.map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-md bg-blue-500/70" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <p className="font-semibold" style={{ color: text }}>Transações recentes</p>
                <div className="mt-3 space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.name} className="flex items-center justify-between rounded-xl p-3" style={{ background: isLight ? "#F8FAFC" : "rgba(255,255,255,0.04)" }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: text }}>{transaction.name}</p>
                        <p className="text-xs" style={{ color: muted }}>{transaction.detail}</p>
                      </div>
                      <p className={`text-sm font-bold ${transaction.green ? "text-emerald-500" : "text-red-500"}`}>{transaction.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
