"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, Wallet } from "lucide-react"
import { AddButton } from "@/components/ui/add-button"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTransactions } from "@/hooks/use-transactions"
import { useCategories } from "@/hooks/use-categories"
import { MonthNavigator, getCurrentMonth } from "@/components/month-navigator"
import { useMonthParam } from "@/hooks/use-month-param"
import { TransactionRow } from "./_components/transaction-row"
import { TransactionTable } from "./_components/transaction-table"
import { TransactionForm } from "./_components/transaction-form"
import { DeleteDialog } from "./_components/delete-dialog"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import type { TransactionWithRelations } from "@/features/transactions/transactions.types"
import type { TransactionInput } from "@/features/transactions/transactions.schema"

interface BankAccountOption {
  id: string
  name: string
  institution: string | null
  type: "CHECKING" | "SAVINGS" | "DIGITAL" | "CASH" | "INVESTMENT" | "BENEFIT"
}

interface InvoiceOption {
  id: string
  month: string
  calculationMode: "CALCULATED" | "ENTERED_TOTAL"
  lifecycleStatus: "ESTIMATED" | "OPEN" | "CLOSED" | "PAID"
  card: { id: string; name: string }
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get("id")
  const [month, setMonth] = useMonthParam({ defaultMonth: getCurrentMonth() })

  const {
    transactions,
    total,
    loading,
    page,
    setPage,
    filters,
    setFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({ month })

  useEffect(() => {
    setFilters((prev) => (prev.month === month ? prev : { ...prev, month }))
    setPage(1)
  }, [month, setFilters, setPage])

  const { categories } = useCategories()
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([])
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])

  useEffect(() => {
    fetch("/api/bank-accounts/options")
      .then((res) => res.json())
      .then((data) => setBankAccounts(data))
      .catch(() => {})
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data: InvoiceOption[]) => setInvoices(data.filter((invoice) => ["ESTIMATED", "OPEN"].includes(invoice.lifecycleStatus))))
      .catch(() => {})
  }, [])

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null)
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const loadedHighlightRef = useRef<string | null>(null)

  useEffect(() => {
    if (!highlightId || loadedHighlightRef.current === highlightId) return
    loadedHighlightRef.current = highlightId

    fetch(`/api/transactions?id=${highlightId}&limit=1`)
      .then((res) => res.json())
      .then((data) => {
        const tx = data.transactions?.[0]
        if (tx) {
          setEditing(tx)
          setFormOpen(true)
        }
      })
      .catch(() => {})
  }, [highlightId])

  const totalPages = Math.ceil(total / 20)
  const filteredIncome = transactions.filter((tx) => tx.type === "INCOME").reduce((sum, tx) => sum + tx.amount, 0)
  const filteredExpense = transactions.filter((tx) => tx.type === "EXPENSE").reduce((sum, tx) => sum + tx.amount, 0)

  async function handleCreate(input: TransactionInput) {
    await createTransaction(input)
    toast.success("Transação criada!")
  }

  async function handleUpdate(input: TransactionInput) {
    if (!editing) return
    await updateTransaction(editing.id, input)
    setEditing(null)
    toast.success("Transação atualizada!")
  }

  async function handleDelete() {
    if (!deleting) return
    setActionLoading(true)
    try {
      await deleteTransaction(deleting.id)
      setDeleting(null)
      setDeleteOpen(false)
      toast.success("Transação removida!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="dashboard-content-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Avulsas, receitas e ajustes · {total} {total === 1 ? "item" : "itens"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <MonthNavigator month={month} todayMonth={getCurrentMonth()} onMonthChange={setMonth} />
          <AddButton
            label="Novo lançamento avulso"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
              <ArrowUp className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Receitas</span>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-success">{formatCurrency(filteredIncome)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ArrowDown className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Despesas</span>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-destructive">{formatCurrency(filteredExpense)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap">
        <Select
          value={filters.type ?? "all"}
          onValueChange={(v) => {
            const value = v ?? "all"
            setFilters({ ...filters, type: value === "all" ? undefined : (value as typeof filters.type) })
          }}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue>
              {filters.type === "INCOME" ? "Receitas" : filters.type === "EXPENSE" ? "Despesas" : "Todos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="INCOME">Receitas</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(v) => {
            const value = v ?? "all"
            setFilters({ ...filters, categoryId: value === "all" ? undefined : value })
          }}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue>
              {filters.categoryId
                ? categories.find((c) => c.id === filters.categoryId)?.name ?? "Todas"
                : "Todas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela — Desktop */}
      <TransactionTable
        transactions={transactions}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onEdit={(tx) => {
          setEditing(tx)
          setFormOpen(true)
        }}
      />

      {/* Cards — Mobile */}
      <div className="space-y-3 md:hidden">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma transação neste mês.
            </p>
          </div>
        ) : (
          transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onEdit={() => {
                setEditing(tx)
                setFormOpen(true)
              }}
              onDelete={() => {
                setDeleting(tx)
                setDeleteOpen(true)
              }}
            />
          ))
        )}

        {/* Paginação — Mobile */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>

      <TransactionForm
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        categories={categories}
        bankAccounts={bankAccounts}
        invoices={invoices}
        activeMonth={searchParams.get("month")}
        initial={
          editing
            ? {
                amount: editing.amount,
                type: editing.type,
                description: editing.description ?? undefined,
                categoryId: editing.categoryId,
                bankAccountId: editing.bankAccountId ?? undefined,
                invoiceId: editing.invoiceItem?.invoiceId ?? undefined,
                date: editing.date,
              }
            : undefined
        }
        title={editing ? "Editar transação" : "Nova transação"}
        onDelete={editing ? () => { setFormOpen(false); setDeleting(editing); setDeleteOpen(true) } : undefined}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        description={
          deleting?.description ??
          `${deleting?.category.name} - ${formatCurrency(deleting?.amount ?? 0)}`
        }
        loading={actionLoading}
      />
    </div>
  )
}
