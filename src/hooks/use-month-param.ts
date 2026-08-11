"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"

interface UseMonthParamOptions {
  defaultMonth: string
  minMonth?: string
  maxMonth?: string
}

function isValidMonth(value: string | null): value is string {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function isWithinRange(month: string, minMonth?: string, maxMonth?: string) {
  return (minMonth === undefined || month >= minMonth) && (maxMonth === undefined || month <= maxMonth)
}

export function useMonthParam({ defaultMonth, minMonth, maxMonth }: UseMonthParamOptions) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const urlMonth = searchParams.get("month")
  const validUrlMonth = isValidMonth(urlMonth) && isWithinRange(urlMonth, minMonth, maxMonth) ? urlMonth : null
  const [interactiveMonth, setInteractiveMonth] = useState<string | null>(null)
  const [previousUrlMonth, setPreviousUrlMonth] = useState(urlMonth)

  if (urlMonth !== previousUrlMonth) {
    setInteractiveMonth(null)
    setPreviousUrlMonth(urlMonth)
  }

  const month = interactiveMonth ?? validUrlMonth ?? defaultMonth
  const setMonth = useCallback((nextMonth: string) => {
    if (!isValidMonth(nextMonth) || !isWithinRange(nextMonth, minMonth, maxMonth)) return

    setInteractiveMonth(nextMonth)
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", nextMonth)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [maxMonth, minMonth, pathname, router, searchParams])

  return [month, setMonth] as const
}
