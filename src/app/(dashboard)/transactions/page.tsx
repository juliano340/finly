"use client"

import { useState } from "react"
import { Plus, Wallet } from "lucide-react"
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
import { TransactionRow } from "./_components/transaction-row"
import { TransactionForm } from "./_components/transaction-form"
import { DeleteDialog } from "./_components/delete-dialog"
import { toast } from "sonner"
import type { TransactionWithRelations } from "@/features/transactions/transactions.types"
import type { TransactionInput } from "@/features/transactions/transactions.schema"

export default function TransactionsPage() {
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
  } = useTransactions()

  const { categories } = useCategories()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null)
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const totalPages = Math.ceil(total / 20)

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

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground">
            Avulsas, receitas, ajustes manuais e lançamentos não recorrentes · {total} {total === 1 ? "item" : "itens"}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo lançamento avulso
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.type ?? "all"}
          onValueChange={(v) => {
            const value = v ?? "all"
            setFilters({ ...filters, type: value === "all" ? undefined : (value as typeof filters.type) })
          }}
        >
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-48">
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

      {/* Lista */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhuma transação ainda. Comece adicionando sua primeira!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
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
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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

      <TransactionForm
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        categories={categories}
        initial={
          editing
            ? {
                amount: editing.amount,
                type: editing.type,
                description: editing.description ?? undefined,
                categoryId: editing.categoryId,
                date: editing.date,
              }
            : undefined
        }
        title={editing ? "Editar transação" : "Nova transação"}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        description={
          deleting?.description ??
          `${deleting?.category.name} - R$ ${deleting?.amount}`
        }
        loading={actionLoading}
      />
    </div>
  )
}
