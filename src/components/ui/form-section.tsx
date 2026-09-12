import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormSectionProps {
  icon: LucideIcon
  title: string
  children: ReactNode
  className?: string
}

export function FormSection({ icon: Icon, title, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  )
}
