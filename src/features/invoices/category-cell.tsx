"use client"

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface CategoryOption {
  id: string
  name: string
  color: string
}

interface CategoryCellProps {
  category: CategoryOption | null
  categories: CategoryOption[]
  onChange: (categoryId: string | null) => void
  align?: "start" | "end"
  compact?: boolean
}

export function CategoryCell({
  category,
  categories,
  onChange,
  align = "start",
  compact = false,
}: CategoryCellProps) {
  const [open, setOpen] = useState(false)

  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-normal outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
          !category && "text-muted-foreground",
          compact && "text-[11px]"
        )}
      >
        {category ? (
          <>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="truncate">{category.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground/60 italic">Sem categoria</span>
        )}
        <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/40" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={4}
        className="min-w-[160px]"
      >
        <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Categorias
        </div>
        <DropdownMenuItem
          onClick={() => {
            onChange(null)
            setOpen(false)
          }}
          className={cn(
            "text-xs",
            !category && "bg-accent/50"
          )}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
          <span className="flex-1">Sem categoria</span>
          {!category && <Check className="h-3 w-3" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {sorted.map((cat) => (
          <DropdownMenuItem
            key={cat.id}
            onClick={() => {
              onChange(cat.id)
              setOpen(false)
            }}
            className={cn(
              "text-xs",
              category?.id === cat.id && "bg-accent/50"
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="flex-1">{cat.name}</span>
            {category?.id === cat.id && <Check className="h-3 w-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
