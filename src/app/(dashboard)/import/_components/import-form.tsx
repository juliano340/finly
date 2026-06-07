"use client"

import { useState } from "react"
import { Upload, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  color: string
}

export function ImportForm({ categories }: { categories: Category[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [categoryId, setCategoryId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors?: string[] } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !categoryId) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("categoryId", categoryId)

    try {
      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        toast.success(`${data.imported} transações importadas!`)
        setFile(null)
      } else {
        toast.error(data.error || "Erro ao importar")
        if (data.issues) {
          setResult({ imported: 0, errors: data.issues })
        }
      }
    } catch {
      toast.error("Erro ao enviar arquivo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Arquivo CSV</Label>
        <div className="flex items-center gap-2">
          <input
            id="file"
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="flex-1 text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Formato: data, valor, descrição (ex: 01/06/2026, -150.00, Alimentação)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Categoria padrão</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria..." />
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
      </div>

      <Button type="submit" disabled={!file || !categoryId || loading}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Importando..." : "Importar"}
      </Button>

      {result && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {result.imported > 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {result.imported} transações importadas com sucesso
                </span>
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Avisos:</span>
                </div>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-6">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  )
}
