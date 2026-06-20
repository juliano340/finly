"use client"

import { useState } from "react"
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
import type { CategoryInput } from "@/features/categories/categories.schema"

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CategoryInput) => Promise<void>
  initial?: Partial<CategoryInput>
  title: string
  onDelete?: () => void
}

const iconOptions = [
  { value: "utensils", label: "🍽️ Alimentação" },
  { value: "car", label: "🚗 Transporte" },
  { value: "home", label: "🏠 Moradia" },
  { value: "gamepad", label: "🎮 Lazer" },
  { value: "heart", label: "❤️ Saúde" },
  { value: "book", label: "📚 Educação" },
  { value: "repeat", label: "🔄 Assinaturas" },
  { value: "shopping-bag", label: "🛍️ Compras" },
  { value: "briefcase", label: "💼 Trabalho" },
  { value: "laptop", label: "💻 Freelance" },
  { value: "wallet", label: "💳 Geral" },
]

const colorOptions = [
  { value: "#E85D5D", label: "Vermelho" },
  { value: "#F59E0B", label: "Laranja" },
  { value: "#22C55E", label: "Verde" },
  { value: "#0EA882", label: "Verde-água" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#6366F1", label: "Índigo" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
]

export function CategoryForm({
  open,
  onOpenChange,
  onSubmit,
  initial,
  title,
  onDelete,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [type, setType] = useState<"Despesa" | "Receita">(initial?.type === "INCOME" ? "Receita" : "Despesa")
  const [icon, setIcon] = useState(initial?.icon ?? "wallet")
  const [color, setColor] = useState(initial?.color ?? "#0EA882")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Nome é obrigatório")
      return
    }
    setError("")
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), type: type === "Receita" ? "INCOME" : "EXPENSE", icon, color })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cat-name">Nome</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alimentação"
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType((v ?? "EXPENSE") as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ícone</Label>
              <Select value={icon} onValueChange={(value) => setIcon(value ?? "wallet")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string | null) =>
                      value ? iconOptions.find((o) => o.value === value)?.label ?? "Selecione..." : "Selecione..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      color === c.value ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !name.trim()}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              className="mt-4 w-full gap-2"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Excluir categoria
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
