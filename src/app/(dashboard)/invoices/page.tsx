import { Suspense } from "react"
import { InvoicesTab } from "@/features/invoices/invoices-tab"

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>}>
      <InvoicesTab />
    </Suspense>
  )
}
