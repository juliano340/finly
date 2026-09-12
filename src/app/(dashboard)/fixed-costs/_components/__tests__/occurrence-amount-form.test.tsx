import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OccurrenceAmountForm } from "@/app/(dashboard)/fixed-costs/_components/occurrence-amount-form"

const occurrence = {
  id: "occurrence-1",
  month: "2026-08",
  amount: 100,
  updatedAt: "2026-08-01T12:00:00.000Z",
}

describe("OccurrenceAmountForm", () => {
  it("começa com escopo somente esta ocorrência", () => {
    render(
      <OccurrenceAmountForm
        occurrence={occurrence}
        onSubmit={vi.fn()}
        onClose={() => {}}
        onEditSeries={() => {}}
      />,
    )

    expect(screen.getByRole("radio", { name: /somente esta ocorrência/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Salvar somente Ago 2026" })).toBeDefined()
  })

  it("valida valor vazio", async () => {
    const onSubmit = vi.fn()
    render(
      <OccurrenceAmountForm
        occurrence={occurrence}
        onSubmit={onSubmit}
        onClose={() => {}}
        onEditSeries={() => {}}
      />,
    )

    await userEvent.clear(screen.getByLabelText(/novo valor/i))
    await userEvent.click(screen.getByRole("button", { name: /salvar somente/i }))

    expect(await screen.findByText("Valor deve ser maior que zero")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("envia payload com escopo e valor parseado", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(
      <OccurrenceAmountForm
        occurrence={occurrence}
        onSubmit={onSubmit}
        onClose={onClose}
        onEditSeries={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole("radio", { name: /esta ocorrência e as próximas/i }))
    const amount = screen.getByLabelText(/novo valor/i)
    await userEvent.clear(amount)
    await userEvent.type(amount, "175")
    await userEvent.click(screen.getByRole("button", { name: /salvar ago 2026 e próximos/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      occurrenceId: "occurrence-1",
      month: "2026-08",
      scope: "THIS_AND_FUTURE",
      amount: 175,
      expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
    })
    expect(onClose).toHaveBeenCalled()
  })

  it("mostra erro do servidor e permite editar a série", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Ocorrência paga"))
    const onEditSeries = vi.fn()
    render(
      <OccurrenceAmountForm
        occurrence={occurrence}
        onSubmit={onSubmit}
        onClose={() => {}}
        onEditSeries={onEditSeries}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar somente/i }))
    expect(await screen.findByText("Ocorrência paga")).toBeDefined()

    await userEvent.click(screen.getByRole("button", { name: /editar configurações da série/i }))
    expect(onEditSeries).toHaveBeenCalledTimes(1)
  })
})
