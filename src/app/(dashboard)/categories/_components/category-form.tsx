"use client"

import { useState } from "react"
import { Palette, Tag, Trash2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormActions } from "@/components/ui/form-actions"
import { FormField } from "@/components/ui/form-field"
import { FormSection } from "@/components/ui/form-section"
import { mapZodErrors } from "@/lib/forms"
import { categorySchema, type CategoryInput } from "@/features/categories/categories.schema"

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

const TYPE_ITEMS: Record<string, string> = {
  EXPENSE: "Despesa",
  INCOME: "Receita",
}

const ICON_ITEMS = Object.fromEntries(iconOptions.map((option) => [option.value, option.label]))

export function CategoryForm({
  open,
  onOpenChange,
  onSubmit,
  initial,
  title,
  onDelete,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE")
  const [icon, setIcon] = useState(initial?.icon ?? "wallet")
  const [color, setColor] = useState(initial?.color ?? "#0EA882")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = categorySchema.safeParse({ name: name.trim(), type, icon, color })
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error, { name: "name" }))
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-6">
            <FormSection icon={Tag} title="Identidade">
              <FormField label="Nome" required error={errors.name}>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.name
                      delete next.submit
                      return next
                    })
                  }}
                  placeholder="Ex: Alimentação"
                  maxLength={50}
                />
              </FormField>
              <FormField label="Tipo">
                <Select
                  items={TYPE_ITEMS}
                  value={type}
                  onValueChange={(value) => setType((value ?? "EXPENSE") as typeof type)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Despesa</SelectItem>
                    <SelectItem value="INCOME">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <FormSection icon={Palette} title="Aparência">
              <FormField label="Ícone">
                <Select items={ICON_ITEMS} value={icon} onValueChange={(value) => setIcon(value ?? "wallet")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Cor">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor da categoria">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={color === c.value}
                      aria-label={c.label}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        color === c.value ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
              </FormField>
            </FormSection>
          </div>
          {errors.submit && (
            <p className="mt-3 text-sm text-destructive" role="alert">{errors.submit}</p>
          )}
          <FormActions onCancel={() => onOpenChange(false)} loading={loading} />
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
