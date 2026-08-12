import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LAST_SELECTED_MONTH_STORAGE_KEY, resolvePersistentMonth, useMonthParam } from "../use-month-param"

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams("tab=invoices"),
  pathname: "/cards",
  router: { replace: vi.fn() },
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.searchParams,
  usePathname: () => navigation.pathname,
  useRouter: () => navigation.router,
}))

describe("useMonthParam", () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams("tab=invoices")
    navigation.router.replace.mockClear()
    window.localStorage.clear()
  })

  it("usa mês da URL e mantém outros parâmetros ao trocar", () => {
    navigation.searchParams.set("month", "2026-09")
    const { result } = renderHook(() => useMonthParam({ defaultMonth: "2026-08" }))

    expect(result.current[0]).toBe("2026-09")

    act(() => result.current[1]("2026-10"))

    expect(navigation.router.replace).toHaveBeenCalledWith(
      "/cards?tab=invoices&month=2026-10",
      { scroll: false },
    )
  })

  it("ignora mês inválido e usa fallback", () => {
    navigation.searchParams.set("month", "2026-13")
    const { result } = renderHook(() => useMonthParam({ defaultMonth: "2026-08" }))

    expect(result.current[0]).toBe("2026-08")

    act(() => result.current[1]("2026-13"))

    expect(navigation.router.replace).not.toHaveBeenCalled()
  })

  it("restaura o último mês salvo quando a URL não informa mês", async () => {
    window.localStorage.setItem(LAST_SELECTED_MONTH_STORAGE_KEY, "2026-07")
    const { result } = renderHook(() => useMonthParam({ defaultMonth: "2026-08" }))

    await waitFor(() => expect(result.current[0]).toBe("2026-07"))
  })

  it("salva no navegador o mês escolhido", () => {
    const { result } = renderHook(() => useMonthParam({ defaultMonth: "2026-08" }))

    act(() => result.current[1]("2026-10"))

    expect(window.localStorage.getItem(LAST_SELECTED_MONTH_STORAGE_KEY)).toBe("2026-10")
  })

  it("mantém a precedência URL, armazenamento e padrão", () => {
    expect(resolvePersistentMonth({ urlMonth: "2026-09", storedMonth: "2026-07", defaultMonth: "2026-08" })).toBe("2026-09")
    expect(resolvePersistentMonth({ urlMonth: null, storedMonth: "2026-07", defaultMonth: "2026-08" })).toBe("2026-07")
    expect(resolvePersistentMonth({ urlMonth: null, storedMonth: "2025-01", defaultMonth: "2026-08", minMonth: "2026-01" })).toBe("2026-08")
  })
})
