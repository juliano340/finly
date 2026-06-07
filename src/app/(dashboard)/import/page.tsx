"use client"

import { useEffect, useState } from "react"
import { FileSpreadsheet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportForm } from "./_components/import-form"

interface Category {
  id: string
  name: string
  color: string
}

export default function ImportPage() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.filter((c: Category & { type: string }) => c.type === "EXPENSE")))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Transações</h1>
        <p className="text-muted-foreground">
          Importe suas transações de um arquivo CSV
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" />
            Arquivo CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImportForm categories={categories} />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Formato esperado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>O arquivo CSV deve conter as colunas:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>data</strong> — no formato DD/MM/AAAA ou AAAA-MM-DD</li>
              <li><strong>valor</strong> — valores negativos para despesas, positivos para receitas</li>
              <li><strong>descrição</strong> (opcional) — descrição da transação</li>
            </ul>
            <div className="mt-4 rounded-lg bg-muted p-3 font-mono text-xs">
              <p>data,valor,descrição</p>
              <p>01/06/2026,-89.90,Supermercado</p>
              <p>05/06/2026,-45.00,Transporte</p>
              <p>10/06/2026,5000.00,Salário</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
