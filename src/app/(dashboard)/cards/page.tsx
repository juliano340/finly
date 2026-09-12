"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CreditCard, Loader2, Settings } from "lucide-react"
import { toast } from "sonner"
import { AddButton } from "@/components/ui/add-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { InvoicesTab } from "@/features/invoices/invoices-tab"
import { CardForm } from "./_components/card-form"
import type { CardInput } from "@/features/cards/cards.schema"
import {
  CARDS_TAB_STORAGE_KEY,
  isCardsTab,
  resolveCardsTab,
  withCardsTab,
  type CardsTab,
} from "@/features/cards/cards-tab-state"

interface CardItem {
  id: string
  name: string
  brand: string | null
  color: string
  closingDay: number | null
  dueDay: number | null
  bankAccountId: string | null
  bankAccount: { id: string; name: string; institution: string | null } | null
}

interface BankAccountItem {
  id: string
  name: string
  institution: string | null
}

export default function CardsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CardsTab>("cards")
  const [tabReady, setTabReady] = useState(false)

  useEffect(() => {
    const urlTab = searchParams.get("tab")
    const nextTab = resolveCardsTab(urlTab, window.localStorage.getItem(CARDS_TAB_STORAGE_KEY))
    const timer = window.setTimeout(() => {
      setActiveTab(nextTab)
      setTabReady(true)
      if (isCardsTab(urlTab)) window.localStorage.setItem(CARDS_TAB_STORAGE_KEY, urlTab)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [searchParams])

  function changeTab(tab: CardsTab) {
    setActiveTab(tab)
    window.localStorage.setItem(CARDS_TAB_STORAGE_KEY, tab)
    router.push(`${pathname}?${withCardsTab(new URLSearchParams(searchParams.toString()), tab)}`, { scroll: false })
  }

  const fetchData = async () => {
    try {
      const [cardsRes, accountsRes] = await Promise.all([
        fetch("/api/cards"),
        fetch("/api/bank-accounts/options"),
      ])
      if (cardsRes.ok) setCards(await cardsRes.json())
      if (accountsRes.ok) setBankAccounts((await accountsRes.json()).filter((account: { type: string }) => account.type !== "BENEFIT"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (input: CardInput) => {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Não foi possível criar o cartão.")
    }
    toast.success("Cartão criado com sucesso.")
    fetchData()
  }

  const handleUpdate = async (cardId: string, input: CardInput) => {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Não foi possível atualizar o cartão.")
    }
    toast.success("Cartão atualizado com sucesso.")
    fetchData()
  }

  const handleDelete = async (cardId: string) => {
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })
    setConfirmDelete(null)
    setSelectedCard(null)
    if (res.ok) {
      toast.success("Cartão excluído.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível excluir o cartão.")
    }
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cartões e Faturas</h1>
        <p className="text-muted-foreground">Gerencie seus cartões de crédito e faturas mensais.</p>
      </div>

      <div className="flex gap-1 rounded-md border bg-background p-1 w-fit">
        <button type="button" onClick={() => changeTab("cards")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Cartões</button>
        <button type="button" onClick={() => changeTab("invoices")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "invoices" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Faturas</button>
      </div>

      {!tabReady ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />Carregando...
        </div>
      ) : activeTab === "cards" && (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <AddButton label="Novo cartão" onClick={() => setCreating(true)} />
          </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cartão</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bandeira</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Fechamento</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Vencimento</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-b" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, columnIndex) => (
                    <td key={columnIndex} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : cards.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum cartão cadastrado.</td></tr>
            ) : cards.map((card) => (
              <tr key={card.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelectedCard(card)} className="flex items-center gap-3 text-left font-medium hover:underline">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ backgroundColor: card.color }}>
                      <CreditCard className="h-4 w-4" />
                    </span>
                    {card.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{card.brand ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{card.bankAccount?.name ?? "-"}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{card.closingDay ?? "-"}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{card.dueDay ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar cartão"
                    onClick={() => setSelectedCard(card)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="rounded-lg border bg-card p-4" aria-hidden="true">
              <div className="flex items-center gap-3">
                <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                </div>
                <div className="size-8 shrink-0 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))
        ) : cards.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum cartão cadastrado.</CardContent></Card>
        ) : cards.map((card) => (
          <div key={card.id} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSelectedCard(card)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                <span className="shrink-0 rounded-lg p-2 text-white" style={{ backgroundColor: card.color }}><CreditCard className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{card.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.brand ?? "Sem bandeira"} · Fecha {card.closingDay ?? "-"} · Vence {card.dueDay ?? "-"}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.bankAccount?.name ?? "Sem conta"}</p>
                </div>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Editar cartão"
                onClick={() => setSelectedCard(card)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <CardForm
        key={selectedCard?.id ?? "new"}
        open={creating || !!selectedCard}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setSelectedCard(null)
          }
        }}
        card={selectedCard}
        bankAccounts={bankAccounts}
        onSubmit={selectedCard ? (input) => handleUpdate(selectedCard.id, input) : handleCreate}
        onDelete={selectedCard ? () => setConfirmDelete(selectedCard.id) : undefined}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Excluir cartão"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
        </div>
      )}

      {tabReady && activeTab === "invoices" && (
        <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>}>
          <InvoicesTab />
        </Suspense>
      )}
    </div>
  )
}
