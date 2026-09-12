export function todayIso() {
  return new Date().toISOString().split("T")[0]
}

export function toIsoDate(value: Date | string) {
  return new Date(value).toISOString().split("T")[0]
}
