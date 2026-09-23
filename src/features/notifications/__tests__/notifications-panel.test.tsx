import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationBell } from "../notifications-panel"

const mocks = vi.hoisted(() => ({
  toastWarning: vi.fn(),
  toastInfo: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated" }),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

vi.mock("sonner", () => ({
  toast: { warning: mocks.toastWarning, info: mocks.toastInfo },
}))

function isoDaysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function mockNotifications(dueDates: string[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        daysAhead: 7,
        notifications: dueDates.map((dueDate, index) => ({
          id: `item-${index}`,
          type: "FIXED_COST",
          title: `Conta ${index + 1}`,
          amount: 100,
          dueDate,
          href: "/fixed-costs",
        })),
      }),
  })
}

describe("NotificationBell", () => {
  beforeEach(() => {
    mocks.toastWarning.mockClear()
    mocks.toastInfo.mockClear()
  })

  it("destaca o sino com contas atrasadas sem disparar toast", async () => {
    vi.stubGlobal("fetch", mockNotifications([isoDaysFromNow(-2), isoDaysFromNow(-1)]))

    render(<NotificationBell />)

    expect(await screen.findByRole("button", { name: /2 contas atrasadas/ })).toBeInTheDocument()
    expect(mocks.toastWarning).not.toHaveBeenCalled()
    expect(mocks.toastInfo).not.toHaveBeenCalled()
  })

  it("volta ao normal depois de abrir os lembretes", async () => {
    vi.stubGlobal("fetch", mockNotifications([isoDaysFromNow(-1)]))
    const user = userEvent.setup()

    render(<NotificationBell />)

    const sino = await screen.findByRole("button", { name: /1 conta atrasada/ })
    await user.click(sino)
    await user.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Abrir lembretes" })).toBeInTheDocument()
  })

  it("não destaca o sino quando só há vencimentos futuros", async () => {
    vi.stubGlobal("fetch", mockNotifications([isoDaysFromNow(3)]))

    render(<NotificationBell />)

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Abrir lembretes" })).toBeInTheDocument()
  })
})
