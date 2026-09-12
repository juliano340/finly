import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
}

export function SubmitButton({
  loading = false,
  loadingText = "Salvando...",
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled || loading} {...props}>
      {loading ? loadingText : children}
    </Button>
  )
}
