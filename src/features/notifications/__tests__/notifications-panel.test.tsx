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
  return date.toISOString()
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

  it("mostra o aviso pulsante de atrasadas sem disparar toast", async () => {
    vi.stubGlobal("fetch", mockNotifications([isoDaysFromNow(-2), isoDaysFromNow(-1)]))

    render(<NotificationBell />)

    expect(await screen.findByText("2 atrasadas")).toBeInTheDocument()
    expect(mocks.toastWarning).not.toHaveBeenCalled()
    expect(mocks.toastInfo).not.toHaveBeenCalled()
  })

  it("não mostra o aviso quando só há vencimentos futuros", async () => {
    vi.stubGlobal("fetch", mockNotifications([isoDaysFromNow(3)]))

    render(<NotificationBell />)

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument())
    expect(screen.queryByText(/atrasada|vence hoje/)).not.toBeInTheDocument()
  })

  it("pode ser fechado pelo usuário", async () => {
    vi.stubGlobal("fetch", mockNotifications([isoDaysFromNow(-1)]))
    const user = userEvent.setup()

    render(<NotificationBell />)

    expect(await screen.findByText("1 atrasada")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Fechar aviso" }))
    expect(screen.queryByText("1 atrasada")).not.toBeInTheDocument()
  })
})
