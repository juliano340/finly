"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TransactionInput } from "@/features/transactions/transactions.schema"
import type { CategoryWithCount } from "@/features/categories/categories.types"

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: TransactionInput) => Promise<void>
  categories: CategoryWithCount[]
  initial?: Partial<TransactionInput>
  title: string
}

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  categories,
  initial,
  title,
}: TransactionFormProps) {
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "")
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [date, setDate] = useState(
    initial?.date ? new Date(initial.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount.replace(",", "."))
    if (!numAmount || numAmount <= 0) {
      setError("Valor deve ser maior que zero")
      return
    }
    if (!categoryId) {
      setError("Selecione uma categoria")
      return
    }
    setError("")
    setLoading(true)
    try {
      await onSubmit({
        amount: numAmount,
        type,
        description: description.trim() || undefined,
        categoryId,
        date: new Date(date + "T12:00:00"),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => { setType(v as typeof type); setCategoryId("") }}>
              <SelectTrigger>
                <SelectValue>
                  {type === "INCOME" ? "Receita" : "Despesa"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Despesa</SelectItem>
                <SelectItem value="INCOME">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={filteredCategories.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione...">
                  {categoryId
                    ? categories.find((c) => c.id === categoryId)?.name ?? "Selecione..."
                    : filteredCategories.length === 0
                    ? "Nenhuma categoria disponível"
                    : "Selecione..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Crie uma categoria de {type === "INCOME" ? "receita" : "despesa"} primeiro
                  </div>
                ) : (
                  filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex: Supermercado Extra"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
