"use client"

import { useState } from "react"
import { Plus, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCategories } from "@/hooks/use-categories"
import { CategoryCard } from "./_components/category-card"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Organize suas receitas e despesas
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
          Nova categoria
        </Button>
      </div>

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
              <h2 className="text-sm font-medium text-muted-foreground">
                Receitas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {incomes.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={() => {
                      setEditing(cat)
                      setFormOpen(true)
                    }}
                    onDelete={() => {
                      setDeleting(cat)
                      setDeleteOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {expenses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Despesas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {expenses.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={() => {
                      setEditing(cat)
                      setFormOpen(true)
                    }}
                    onDelete={() => {
                      setDeleting(cat)
                      setDeleteOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
