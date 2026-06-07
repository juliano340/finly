"use client"

import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Você está logado no Finly</p>
      <a href="/login">
        <Button variant="outline">Sair</Button>
      </a>
    </div>
  )
}
