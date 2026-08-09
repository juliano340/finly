"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCategories } from "@/hooks/use-categories"
import { CategoryCard } from "./_components/category-card"
import { CategoryTable } from "./_components/category-table"
import { CategoryForm } from "./_components/category-form"
import { DeleteDialog } from "./_components/delete-dialog"
import { toast } from "sonner"
import type { CategoryInput } from "@/features/categories/categories.schema"
import type { CategoryWithCount } from "@/features/categories/categories.types"

export default function CategoriesPage() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryWithCount | null>(null)
  const [deleting, setDeleting] = useState<CategoryWithCount | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const incomes = categories.filter((c) => c.type === "INCOME")
  const expenses = categories.filter((c) => c.type === "EXPENSE")

  async function handleCreate(input: CategoryInput) {
    await createCategory(input)
    toast.success("Categoria criada!")
  }

  async function handleUpdate(input: CategoryInput) {
    if (!editing) return
    await updateCategory(editing.id, input)
    setEditing(null)
    toast.success("Categoria atualizada!")
  }

  async function handleDelete() {
    if (!deleting) return
    setActionLoading(true)
    try {
      await deleteCategory(deleting.id)
      setDeleting(null)
      setDeleteOpen(false)
      toast.success("Categoria removida!")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao remover categoria"
      )
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="dashboard-content-enter space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Organize receitas e despesas · {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="w-full gap-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
              <ArrowUp className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Receitas</span>
          </div>
          <p className="mt-2 text-sm font-bold text-success">{incomes.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ArrowDown className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Despesas</span>
          </div>
          <p className="mt-2 text-sm font-bold text-destructive">{expenses.length}</p>
        </div>
      </div>

      {/* Tabela — Desktop */}
      <CategoryTable
        categories={categories}
        loading={loading}
        onEdit={(cat) => {
          setEditing(cat)
          setFormOpen(true)
        }}
      />

      {/* Cards — Mobile */}
      <div className="md:hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria ainda. Crie sua primeira!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {incomes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Receitas
                  </h2>
                  <span className="text-xs text-muted-foreground">{incomes.length}</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {incomes.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onEdit={() => {
                        setEditing(cat)
                        setFormOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {expenses.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Despesas
                  </h2>
                  <span className="text-xs text-muted-foreground">{expenses.length}</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {expenses.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onEdit={() => {
                        setEditing(cat)
                        setFormOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CategoryForm
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        initial={
          editing
            ? {
                name: editing.name,
                type: editing.type,
                icon: editing.icon,
                color: editing.color,
              }
            : undefined
        }
        title={editing ? "Editar categoria" : "Nova categoria"}
        onDelete={
          editing
            ? () => {
                setDeleting(editing)
                setDeleteOpen(true)
              }
            : undefined
        }
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        categoryName={deleting?.name ?? ""}
        loading={actionLoading}
      />
    </div>
  )
}
