import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMonthParam } from "../use-month-param"

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
})
