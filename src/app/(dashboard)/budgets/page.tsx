"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Wallet, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { BudgetCard } from "./_components/budget-card"
import { BudgetForm } from "./_components/budget-form"
import { DeleteDialog } from "./_components/delete-dialog"

interface Category {
  id: string
  name: string
  color: string
}

interface Budget {
  id: string
  amount: number
  month: string
  categoryId: string
  category: Category
}

interface BudgetSummary {
  budgeted: number
  spent: number
  remaining: number
  percentage: number
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(month: string) {
  const [year, m] = month.split("-")
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(getCurrentMonth)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [summary, setSummary] = useState<BudgetSummary[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetsRes, catsRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}`),
        fetch("/api/categories"),
      ])
      if (budgetsRes.ok) {
        const data = await budgetsRes.json()
        setBudgets(data.budgets)
        setSummary(data.summary)
      }
      if (catsRes.ok) {
        const cats = await catsRes.json()
        setCategories(cats.filter((c: Category & { type: string }) => c.type === "EXPENSE"))
      }
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    fetchData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData])

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 2)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const handleSubmit = async (data: { amount: number; categoryId: string; month: string }) => {
    const method = editBudget ? "PUT" : "POST"
    const url = editBudget ? `/api/budgets/${editBudget.id}` : "/api/budgets"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      toast.success(editBudget ? "Orçamento atualizado!" : "Orçamento criado!")
      setFormOpen(false)
      setEditBudget(null)
      fetchData()
    } else {
      toast.error("Erro ao salvar orçamento")
    }
  }

  const handleDelete = async () => {
    if (!deleteBudget) return
    const res = await fetch(`/api/budgets/${deleteBudget.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Orçamento excluído!")
      setDeleteBudget(null)
      fetchData()
    }
  }

  const totalBudgeted = summary.reduce((acc, s) => acc + s.budgeted, 0)
  const totalSpent = summary.reduce((acc, s) => acc + s.spent, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Controle seus gastos mensais por categoria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{formatMonth(month)}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-primary/10 p-3">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Orçado</p>
              <p className="text-xl font-bold">
                {totalBudgeted.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-red-50 p-3">
              <Wallet className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Gasto</p>
              <p className="text-xl font-bold">
                {totalSpent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-emerald-50 p-3">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Restante</p>
              <p className="text-xl font-bold">
                {(totalBudgeted - totalSpent).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <Button size="sm" onClick={() => { setEditBudget(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Nenhum orçamento definido para este mês. Crie um para começar a controlar seus gastos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget, idx) => (
            <BudgetCard
              key={budget.id}
              id={budget.id}
              amount={budget.amount}
              spent={summary[idx]?.spent ?? 0}
              remaining={summary[idx]?.remaining ?? 0}
              percentage={summary[idx]?.percentage ?? 0}
              categoryName={budget.category.name}
              categoryColor={budget.category.color}
              onEdit={() => { setEditBudget(budget); setFormOpen(true) }}
              onDelete={() => setDeleteBudget(budget)}
            />
          ))}
        </div>
      )}

      <BudgetForm
        key={editBudget?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditBudget(null) }}
        categories={categories}
        initialData={editBudget ? { id: editBudget.id, amount: editBudget.amount, categoryId: editBudget.categoryId } : undefined}
        onSubmit={handleSubmit}
        month={month}
      />

      <DeleteDialog
        open={!!deleteBudget}
        onOpenChange={(open) => { if (!open) setDeleteBudget(null) }}
        onConfirm={handleDelete}
        categoryName={deleteBudget?.category.name ?? ""}
      />
    </div>
  )
}
