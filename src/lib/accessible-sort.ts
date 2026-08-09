export type SortDirection = "asc" | "desc"

export function ariaSort(direction: SortDirection): "ascending" | "descending" {
  return direction === "asc" ? "ascending" : "descending"
}

export function sortButtonLabel(
  label: string,
  active: boolean,
  direction: SortDirection
): string {
  if (!active) return `Ordenar por ${label} em ordem crescente`
  const current = direction === "asc" ? "crescente" : "decrescente"
  const next = direction === "asc" ? "decrescente" : "crescente"
  return `Ordenado por ${label} em ordem ${current}; ordenar em ordem ${next}`
}
