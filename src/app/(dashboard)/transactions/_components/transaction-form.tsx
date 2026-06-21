"use client"

import { useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  onDelete?: () => void
}

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  categories,
  initial,
  title,
  onDelete,
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
  const inFlightRef = useRef(false)

  const filteredCategories = categories.filter((c) => c.type === type)

  async function handleSubmit() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const numAmount = parseFloat(amount.replace(",", "."))
    if (!numAmount || numAmount <= 0) {
      setError("Valor deve ser maior que zero")
      inFlightRef.current = false
      return
    }
    if (!categoryId) {
      setError("Selecione uma categoria")
      inFlightRef.current = false
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
      setLoading(false)
      inFlightRef.current = false
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d,]/g, "")
                  setAmount(raw)
                }}
                onBlur={() => {
                  if (!amount) return
                  const num = parseFloat(amount.replace(",", "."))
                  if (!isNaN(num)) {
                    setAmount(num.toFixed(2).replace(".", ","))
                  }
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => { setType((v ?? "EXPENSE") as typeof type); setCategoryId("") }}>
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
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")} disabled={filteredCategories.length === 0}>
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
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Supermercado Extra"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" disabled={loading} onClick={handleSubmit}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {onDelete && (
            <Button type="button" variant="destructive" className="mt-2 w-full" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />Excluir transação
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
