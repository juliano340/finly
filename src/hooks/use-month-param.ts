"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export const LAST_SELECTED_MONTH_STORAGE_KEY = "finly:last-selected-month"

interface UseMonthParamOptions {
  defaultMonth: string
  minMonth?: string
  maxMonth?: string
}

export function isValidMonth(value: string | null): value is string {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function isWithinRange(month: string, minMonth?: string, maxMonth?: string) {
  return (minMonth === undefined || month >= minMonth) && (maxMonth === undefined || month <= maxMonth)
}

export function resolvePersistentMonth({
  urlMonth,
  storedMonth,
  defaultMonth,
  minMonth,
  maxMonth,
}: UseMonthParamOptions & { urlMonth: string | null; storedMonth: string | null }) {
  if (isValidMonth(urlMonth) && isWithinRange(urlMonth, minMonth, maxMonth)) return urlMonth
  if (isValidMonth(storedMonth) && isWithinRange(storedMonth, minMonth, maxMonth)) return storedMonth
  return defaultMonth
}

export function useMonthParam({ defaultMonth, minMonth, maxMonth }: UseMonthParamOptions) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const urlMonth = searchParams.get("month")
  const validUrlMonth = isValidMonth(urlMonth) && isWithinRange(urlMonth, minMonth, maxMonth) ? urlMonth : null
  const [interactiveMonth, setInteractiveMonth] = useState<string | null>(null)
  const [storedMonth, setStoredMonth] = useState<string | null>(null)
  const [previousUrlMonth, setPreviousUrlMonth] = useState(urlMonth)

  if (urlMonth !== previousUrlMonth) {
    setInteractiveMonth(null)
    setPreviousUrlMonth(urlMonth)
  }

  useEffect(() => {
    const nextStoredMonth = validUrlMonth ?? window.localStorage.getItem(LAST_SELECTED_MONTH_STORAGE_KEY)
    const timer = window.setTimeout(() => setStoredMonth(nextStoredMonth), 0)
    if (validUrlMonth) window.localStorage.setItem(LAST_SELECTED_MONTH_STORAGE_KEY, validUrlMonth)
    return () => window.clearTimeout(timer)
  }, [validUrlMonth])

  const month = interactiveMonth ?? resolvePersistentMonth({
    urlMonth: validUrlMonth,
    storedMonth,
    defaultMonth,
    minMonth,
    maxMonth,
  })
  const setMonth = useCallback((nextMonth: string) => {
    if (!isValidMonth(nextMonth) || !isWithinRange(nextMonth, minMonth, maxMonth)) return

    setInteractiveMonth(nextMonth)
    setStoredMonth(nextMonth)
    window.localStorage.setItem(LAST_SELECTED_MONTH_STORAGE_KEY, nextMonth)
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", nextMonth)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [maxMonth, minMonth, pathname, router, searchParams])

  return [month, setMonth] as const
}
