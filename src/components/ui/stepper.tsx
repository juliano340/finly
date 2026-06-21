"use client"

import { cn } from "@/lib/utils"

interface StepperStep {
  title: string
}

interface StepperProps {
  steps: StepperStep[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1
        const isClickable = isCompleted

        return (
          <div key={step.title} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => onStepClick?.(index)}
              className={cn(
                "flex flex-col items-center gap-1.5",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "border-2 border-primary bg-primary/10 text-primary",
                  !isCompleted && !isCurrent && "border-2 border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight transition-colors",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground/50"
                )}
              >
                {step.title}
              </span>
            </button>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 mb-5 h-px w-12 sm:w-20 transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
