"use client"

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  className?: string
  labelClassName?: string
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  const generatedId = useId()
  const childId = isValidElement(children) ? (children.props as { id?: string }).id : undefined
  const fieldId = htmlFor ?? childId ?? generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  let field = children
  if (isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>
    field = cloneElement(children as ReactElement<Record<string, unknown>>, {
      id: (childProps.id as string | undefined) ?? fieldId,
      "aria-invalid": error ? true : (childProps["aria-invalid"] as boolean | undefined),
      "aria-describedby":
        (childProps["aria-describedby"] as string | undefined) ?? (error ? errorId : hint ? hintId : undefined),
    })
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={fieldId} className={cn(labelClassName)}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {field}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">{error}</p>
      )}
    </div>
  )
}
