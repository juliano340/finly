"use client"

import { useId } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizeAmount, sanitizeAmount } from "@/lib/amount"
import { cn } from "@/lib/utils"

interface MoneyInputProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  required?: boolean
  error?: string
  hint?: string
  placeholder?: string
  id?: string
  className?: string
  inputClassName?: string
}

export function MoneyInput({
  value,
  onValueChange,
  label,
  required,
  error,
  hint,
  placeholder = "0,00",
  id,
  className,
  inputClassName,
}: MoneyInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  const input = (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(sanitizeAmount(event.target.value))}
        onBlur={() => {
          const normalized = normalizeAmount(value)
          if (normalized !== null) onValueChange(normalized)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn("h-10 pl-10 text-base font-medium", inputClassName)}
      />
    </div>
  )

  if (!label) return input

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {input}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-destructive" role="alert">{error}</p>
      )}
    </div>
  )
}
