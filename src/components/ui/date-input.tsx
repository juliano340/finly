"use client"

import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

interface DateInputProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  required?: boolean
  error?: string
  hint?: string
  id?: string
  className?: string
}

export function DateInput({
  value,
  onValueChange,
  label,
  required,
  error,
  hint,
  id,
  className,
}: DateInputProps) {
  const input = (
    <Input type="date" value={value} onChange={(event) => onValueChange(event.target.value)} required={required} />
  )

  if (!label) return input

  return (
    <FormField label={label} htmlFor={id} required={required} error={error} hint={hint} className={className}>
      {input}
    </FormField>
  )
}
