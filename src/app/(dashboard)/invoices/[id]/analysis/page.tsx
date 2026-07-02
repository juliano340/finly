"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CategoryCell } from "@/features/invoices/category-cell"
import { CategoryChart } from "./category-chart"
import { SpendingTimeline } from "./spending-timeline"
import { SpendingWaves } from "./spending-waves"
import { PurchaseFrequency } from "./purchase-frequency"
import { RankingTable } from "./ranking-table"

interface CategoryInfo {
  id: string
  name: string
  color: string
}

interface TransactionItem {
  id: string
  date: Date | null
  description: string
  amount: number
  type: string | null
  categoryId: string | null
  suggestedCategoryId: string | null
}

interface RankingItem {
  description: string
  count: number
  total: number
  originals: string[]
  txs: Array<{ date: Date | null; amount: number; description: string }>
  categoryId: string | null
  suggestedCategoryId: string | null
}

interface AnalysisData {
  session: {
    id: string
    fileName: string
    bank: string | null
    invoiceTotal: number | null
    dueDate: Date | null
    rawText: string
    createdAt: Date
  }
  summary: {
    totalTransactions: number
    totalAmount: number
    diffFromInvoice: number | null
    rankingCount: number
    similarGroups: number
  }
  transactions: TransactionItem[]
  ranking: RankingItem[]
  chartData: Array<{
    name: string
    color: string
    total: number
    count: number
  }>
  categories: CategoryInfo[]
}

function findCategory(
  categories: CategoryInfo[],
  categoryId: string | null
): CategoryInfo | null {
  return categoryId ? categories.find((c) => c.id === categoryId) ?? null : null
}

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingTxs, setSavingTxs] = useState<Set<string>>(new Set())
  const [autoCategorizing, setAutoCategorizing] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setInvoiceId(id))
  }, [params])

  useEffect(() => {
    if (!invoiceId) return
    fetch(`/api/invoices/${invoiceId}/import/analysis`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar análise")
        return res.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [invoiceId])

  const updateTransactionCategory = useCallback(
    async (transactionId: string, categoryId: string | null) => {
      if (!invoiceId || !data) return

      setSavingTxs((prev) => new Set(prev).add(transactionId))

      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === transactionId ? { ...t, categoryId, suggestedCategoryId: null } : t
          ),
        }
      })

      try {
        const res = await fetch(
          `/api/invoices/${invoiceId}/import/transactions/${transactionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId }),
          }
        )

        if (!res.ok) throw new Error("Erro ao salvar categoria")

        const updated = await res.json()

        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            transactions: prev.transactions.map((t) =>
              t.id === transactionId
                ? {
                    ...t,
                    categoryId: updated.category?.id ?? null,
                    suggestedCategoryId: null,
                  }
                : t
            ),
          }
        })

        toast.success("Categoria atualizada")
      } catch {
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            transactions: prev.transactions.map((t) =>
              t.id === transactionId
                ? { ...t, categoryId: data.transactions.find((tx) => tx.id === transactionId)?.categoryId ?? null }
                : t
            ),
          }
        })
        toast.error("Erro ao salvar categoria")
      } finally {
        setSavingTxs((prev) => {
          const next = new Set(prev)
          next.delete(transactionId)
          return next
        })
      }
    },
    [invoiceId, data]
  )

  const handleAutoCategorize = useCallback(async () => {
    if (!invoiceId || autoCategorizing) return
    setAutoCategorizing(true)
    try {
      const res = await fetch(
        `/api/invoices/${invoiceId}/import/auto-categorize`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Erro ao categorizar")
      const result = await res.json()
      toast.success(
        `${result.categorized} transações categorizadas` +
          (result.created > 0 ? ` · ${result.created} novas categorias` : "")
      )
      const analysisRes = await fetch(`/api/invoices/${invoiceId}/import/analysis`)
      if (analysisRes.ok) {
        setData(await analysisRes.json())
      }
    } catch {
      toast.error("Erro ao categorizar automaticamente")
    } finally {
      setAutoCategorizing(false)
    }
  }, [invoiceId, autoCategorizing])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {error || "Dados não encontrados"}
          </CardContent>
        </Card>
      </div>
    )
  }

  const categorized = data.transactions.filter((t) => t.categoryId).length
  const uncategorized = data.transactions.length - categorized

  return (
    <div key="content" className="space-y-4" style={{ animation: "dashboard-page-enter 450ms cubic-bezier(0.22, 1.2, 0.36, 1) both" }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Análise da Fatura</h1>
          <p className="text-xs text-muted-foreground">{data.session.fileName}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Banco</p>
            <p className="text-base font-semibold mt-1">{data.session.bank ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total da fatura</p>
            <p className="text-base font-semibold mt-1">
              {data.session.invoiceTotal
                ? formatCurrency(data.session.invoiceTotal)
                : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Vencimento</p>
            <p className="text-base font-semibold mt-1">
              {data.session.dueDate
                ? formatDate(data.session.dueDate)
                : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Transações</p>
            <p className="text-base font-semibold mt-1">{data.summary.totalTransactions}</p>
            {data.summary.diffFromInvoice !== null && (
              <p
                className={`text-[11px] mt-0.5 ${
                  Math.abs(data.summary.diffFromInvoice) < 0.01
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                Dif: {formatCurrency(data.summary.diffFromInvoice)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Compras{" "}
              <span className="font-normal text-muted-foreground">
                ({data.transactions.length})
                {uncategorized > 0 && (
                  <span className="ml-1.5 text-amber-600 font-medium">
                    · {uncategorized} sem categoria
                  </span>
                )}
              </span>
            </CardTitle>
            {uncategorized > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoCategorize}
                disabled={autoCategorizing}
                className="h-7 gap-1.5 text-xs"
              >
                {autoCategorizing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Categorizar automaticamente
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-w-5xl mx-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="sticky top-0 z-10 bg-background px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-24">
                    Data
                  </th>
                  <th className="sticky top-0 z-10 bg-background px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="sticky top-0 z-10 bg-background px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-40">
                    Categoria
                  </th>
                  <th className="sticky top-0 z-10 bg-background px-3 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t, i) => {
                  const cat = findCategory(data.categories, t.categoryId)
                  const suggested = t.suggestedCategoryId
                    ? findCategory(data.categories, t.suggestedCategoryId)
                    : null
                  const saving = savingTxs.has(t.id)
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-border/50 text-sm ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      } ${
                        !t.categoryId ? "bg-amber-500/[0.03]" : ""
                      } hover:bg-muted/40 transition-colors`}
                    >
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs">
                        {t.date ? formatDate(t.date) : "-"}
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {saving && (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                          )}
                          <CategoryCell
                            category={cat}
                            categories={data.categories}
                            onChange={(categoryId) =>
                              updateTransactionCategory(t.id, categoryId)
                            }
                            align="start"
                            compact
                          />
                          {!cat && suggested && (
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">
                              sug: {suggested.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium monetary whitespace-nowrap">
                        {formatCurrency(Math.abs(t.amount))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <CategoryChart data={data.chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">Evolução dos Gastos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <SpendingTimeline
              txs={data.ranking.flatMap((r) =>
                r.txs.map((t) => ({ date: t.date, amount: t.amount }))
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">Incidência de Compras</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <SpendingWaves
              txs={data.ranking.flatMap((r) =>
                r.txs.map((t) => ({
                  date: t.date,
                  amount: t.amount,
                  description: t.description,
                  normalizedDesc: r.description,
                  categoryId: r.categoryId,
                }))
              )}
              categories={data.categories}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">Frequência de Compras</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <PurchaseFrequency ranking={data.ranking} categories={data.categories} />
          </CardContent>
        </Card>



        <Card className="lg:col-span-3">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold">Ranking por Descrição</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <RankingTable data={data.ranking} categories={data.categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
