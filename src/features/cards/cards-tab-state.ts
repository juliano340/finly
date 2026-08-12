export type CardsTab = "cards" | "invoices"

export const CARDS_TAB_STORAGE_KEY = "finly:cards-active-tab"

export function isCardsTab(value: string | null): value is CardsTab {
  return value === "cards" || value === "invoices"
}

export function resolveCardsTab(urlTab: string | null, storedTab: string | null): CardsTab {
  if (isCardsTab(urlTab)) return urlTab
  if (isCardsTab(storedTab)) return storedTab
  return "cards"
}

export function withCardsTab(searchParams: URLSearchParams, tab: CardsTab) {
  const next = new URLSearchParams(searchParams)
  next.set("tab", tab)
  return next.toString()
}
