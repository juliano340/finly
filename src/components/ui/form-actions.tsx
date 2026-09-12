import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import { cn } from "@/lib/utils"

interface FormActionsProps {
  onCancel: () => void
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  className?: string
}

export function FormActions({
  onCancel,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  loading,
  className,
}: FormActionsProps) {
  return (
    <div className={cn("mt-6 flex gap-2", className)}>
      <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <SubmitButton className="flex-1" loading={loading}>
        {submitLabel}
      </SubmitButton>
    </div>
  )
}
