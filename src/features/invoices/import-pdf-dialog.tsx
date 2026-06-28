"use client"

import { useState, useRef } from "react"
import { Upload, Loader2, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface CardOption {
  id: string
  name: string
  color: string
}

interface ImportPdfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId?: string
  cards?: CardOption[]
  onImportComplete: (invoiceId?: string) => void
}

export function ImportPdfDialog({
  open,
  onOpenChange,
  invoiceId,
  cards,
  onImportComplete,
}: ImportPdfDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [cardId, setCardId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!file) return
    if (!invoiceId && !cardId) {
      setError("Selecione um cartão")
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    const isStandalone = !invoiceId && !!cardId
    const url = isStandalone
      ? "/api/invoices/import-pdf"
      : `/api/invoices/${invoiceId}/import`

    if (isStandalone) {
      formData.append("cardId", cardId)
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`${data.transactionCount} transações importadas!`)
        setFile(null)
        setCardId("")
        onOpenChange(false)
        onImportComplete(data.invoiceId ?? invoiceId)
      } else {
        setError(data.error || "Erro ao importar")
      }
    } catch {
      setError("Erro ao enviar arquivo")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.type !== "application/pdf") {
        setError("Apenas arquivos PDF são aceitos")
        return
      }
      setFile(selected)
      setError(null)
    }
  }

  const handleClose = () => {
    setFile(null)
    setCardId("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar fatura PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!invoiceId && cards && cards.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cartão</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
              >
                <option value="">Selecione um cartão</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    fileInputRef.current?.click()
                  }}
                >
                  Trocar arquivo
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste ou clique para selecionar
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar PDF
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!file || loading || (!invoiceId && !cardId)}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
