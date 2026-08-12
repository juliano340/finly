import type { ReactNode } from "react"

export function DataTableContainer({ children }: { children: ReactNode }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border md:block">
      {children}
    </div>
  )
}
