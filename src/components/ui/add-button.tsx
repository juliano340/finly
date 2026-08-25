import type { ComponentProps } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AddButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  label: string
}

export function AddButton({ label, className, ...props }: AddButtonProps) {
  return (
    <Button className={cn("w-full gap-2 sm:w-auto", className)} {...props}>
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  )
}
