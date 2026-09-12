"use client"

import { useState } from "react"
import { changeMonth, formatMonth } from "@/lib/months"

export interface CardOption {
  id: string
  name: string
  dueDay: number | null
}

export interface InvoiceOption {
  id: string
  month: string
  calculationMode: "CALCULATED" | "ENTERED_TOTAL"
  lifecycleStatus: "ESTIMATED" | "OPEN" | "CLOSED" | "PAID"
  card: { id: string; name: string }
}

interface UseInvoiceAutoCreateOptions {
  cards: CardOption[]
  invoices: InvoiceOption[]
  activeMonth?: string | null
  initialInvoiceId?: string
  onInvoiceCreated?: (invoice: InvoiceOption) => void
}

export function useInvoiceAutoCreate({
  cards,
  invoices,
  activeMonth,
  initialInvoiceId = "",
  onInvoiceCreated,
}: UseInvoiceAutoCreateOptions) {
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId)
  const [cardId, setCardId] = useState(
    invoices.find((invoice) => invoice.id === initialInvoiceId)?.card.id ?? "",
  )
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceNotice, setInvoiceNotice] = useState("")
  const [invoiceError, setInvoiceError] = useState("")

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId)
  const effectiveCardId = cardId || selectedInvoice?.card.id || ""
  const cardInvoices = invoices.filter((invoice) => invoice.card.id === effectiveCardId)

  function selectInvoice(value: string) {
    setInvoiceId(value)
  }

  function resetCardSelection() {
    setCardId("")
    setInvoiceId("")
    setInvoiceNotice("")
    setInvoiceError("")
  }

  async function selectCard(value: string) {
    setCardId(value)
    setInvoiceNotice("")
    setInvoiceError("")
    const matchingInvoices = invoices.filter((invoice) => invoice.card.id === value)
    // Prioriza o mês ativo; senão, a próxima fatura aberta/estimada (ex: mês ativo já fechado)
    const upcoming = matchingInvoices
      .filter((invoice) => !activeMonth || invoice.month >= activeMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
    const preferredInvoice = matchingInvoices.find((invoice) => invoice.month === activeMonth) ?? upcoming[0]

    if (preferredInvoice) {
      setInvoiceId(preferredInvoice.id)
      if (activeMonth && preferredInvoice.month !== activeMonth) {
        setInvoiceNotice(`Fatura de ${formatMonth(activeMonth)} fechada — lançando em ${formatMonth(preferredInvoice.month)}`)
      }
      return
    }
    if (!activeMonth) return

    // Nenhuma fatura aberta: auto-criar (no mês ativo, ou no próximo se o ativo já está fechado/pago)
    const card = cards.find((c) => c.id === value)
    if (!card) return

    setCreatingInvoice(true)
    try {
      // Revalida no servidor: pode existir fatura fora da lista local (fechada/paga)
      let targetMonth = activeMonth
      const listRes = await fetch(`/api/invoices?month=${activeMonth}`)
      if (listRes.ok) {
        const serverInvoices: InvoiceOption[] = await listRes.json()
        const existing = serverInvoices.find((inv) => inv.card.id === value)
        if (existing) {
          if (existing.lifecycleStatus === "ESTIMATED" || existing.lifecycleStatus === "OPEN") {
            onInvoiceCreated?.(existing)
            setInvoiceId(existing.id)
            return
          }
          targetMonth = changeMonth(activeMonth, 1)
          setInvoiceNotice(`Fatura de ${formatMonth(activeMonth)} fechada — lançando em ${formatMonth(targetMonth)}`)
        }
      }

      const [year, month] = targetMonth.split("-").map(Number)
      const dueDay = card.dueDay ?? 10
      const dueDate = new Date(year, month - 1, dueDay)

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: value,
          month: targetMonth,
          dueDate: dueDate.toISOString(),
          amount: 0,
          lifecycleStatus: "OPEN",
          autoCreated: true,
        }),
      })

      if (res.ok) {
        const newInvoice: InvoiceOption = await res.json()
        onInvoiceCreated?.(newInvoice)
        setInvoiceId(newInvoice.id)
      } else {
        const err = await res.json().catch(() => null)
        setInvoiceError(err?.error ?? "Não foi possível criar a fatura")
      }
    } catch {
      setInvoiceError("Não foi possível criar a fatura")
    } finally {
      setCreatingInvoice(false)
    }
  }

  return {
    cardId,
    invoiceId,
    effectiveCardId,
    cardInvoices,
    selectedInvoice,
    creatingInvoice,
    invoiceNotice,
    invoiceError,
    selectInvoice,
    selectCard,
    resetCardSelection,
  }
}
