"use client"

import { useCallback, useSyncExternalStore } from "react"

export function useIsNarrow(breakpoint = 640) {
  const query = `(max-width: ${breakpoint - 1}px)`
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener("change", onStoreChange)
      return () => mediaQuery.removeEventListener("change", onStoreChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
