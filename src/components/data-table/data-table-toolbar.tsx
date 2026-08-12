import type { ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

interface DataTableToolbarProps {
  selectedCount: number
  totalSelected: number
  itemLabel?: string
  onConfirmDelete: () => void
  onClearSelection: () => void
  defaultContent?: ReactNode
  extraActions?: ReactNode
}

export function DataTableToolbar({
  selectedCount,
  totalSelected,
  itemLabel = "item",
  onConfirmDelete,
  onClearSelection,
  defaultContent,
  extraActions,
}: DataTableToolbarProps) {
  const plural = selectedCount !== 1 ? "s" : ""

  return (
    <div className="flex h-12 items-center border-b bg-muted/50 px-4 transition-opacity duration-150">
      {selectedCount > 0 ? (
        <>
          <span className="text-sm font-medium">
            {selectedCount} {itemLabel}{plural} selecionado{plural}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({formatCurrency(totalSelected)})
            </span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            {extraActions}
            <Button size="sm" variant="destructive" className="gap-2" onClick={onConfirmDelete}>
              <Trash2 className="h-4 w-4" /> Excluir{plural}
            </Button>
            <Button size="sm" variant="outline" onClick={onClearSelection}>Limpar</Button>
          </div>
        </>
      ) : (
        defaultContent ?? null
      )}
    </div>
  )
}
