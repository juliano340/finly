"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { MoneyInput } from "@/components/ui/money-input"
import { SubmitButton } from "@/components/ui/submit-button"
import { mapZodErrors } from "@/lib/forms"
import { parseAmount } from "@/lib/amount"
import { budgetSchema } from "@/features/budgets/budgets.schema"

interface Category {
  id: string
  name: string
  color: string
}

interface BudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  initialData?: {
    id: string
    amount: number
    categoryId: string
  }
  onSubmit: (data: { amount: number; categoryId: string; month: string }) => Promise<void> | void
  month: string
}

export function BudgetForm({
  open,
  onOpenChange,
  categories,
  initialData,
  onSubmit,
  month,
}: BudgetFormProps) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? "")
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const parsed = budgetSchema.safeParse({
      amount: parseAmount(amount),
      categoryId,
      month,
    })
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error, { amount: "amount", categoryId: "category", month: "month" }))
      return
    }

    setErrors({})
    setLoading(true)
    try {
      await onSubmit(parsed.data)
      onOpenChange(false)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erro ao salvar" })
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <MoneyInput
            label="Valor mensal"
            required
            error={errors.amount}
            value={amount}
            onValueChange={(value) => {
              setAmount(value)
              setErrors((prev) => {
                const next = { ...prev }
                delete next.amount
                delete next.submit
                return next
              })
            }}
          />
          <FormField label="Categoria" required error={errors.category}>
            <Select
              items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value ?? "")
                setErrors((prev) => {
                  const next = { ...prev }
                  delete next.category
                  delete next.submit
                  return next
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {errors.submit && (
            <p className="text-sm text-destructive" role="alert">{errors.submit}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton loading={loading}>
              {initialData ? "Salvar" : "Criar"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
