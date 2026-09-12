import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OccurrenceAmountForm } from "@/app/(dashboard)/fixed-costs/_components/occurrence-amount-form"
import type { OccurrencePaymentSource } from "@/features/fixed-costs/occurrence-payment"

const cards = [{ id: "card_1", name: "Nubank" }]
const bankAccounts = [
  { id: "acc_1", name: "Itaú" },
  { id: "acc_2", name: "Nubank Conta" },
]

const occurrence = {
  id: "occurrence-1",
  month: "2026-08",
  amount: 100,
  updatedAt: "2026-08-01T12:00:00.000Z",
  scheduledDate: new Date(2026, 7, 1),
  dueDate: new Date(2026, 7, 10),
  paymentMethodOverride: null,
  cardIdOverride: null,
  bankAccountIdOverride: null,
  fixedCost: {
    type: "EXPENSE" as const,
    paymentMethod: "PIX",
    paidInsideCard: false,
    cardId: null,
    bankAccountId: "acc_1",
    dueDay: 10,
  },
}

function renderForm(
  overrides: Partial<OccurrencePaymentSource & { id: string; amount: number; updatedAt: string }> = {},
) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(
    <OccurrenceAmountForm
      occurrence={{ ...occurrence, ...overrides }}
      cards={cards}
      bankAccounts={bankAccounts}
      onSubmit={onSubmit}
      onClose={onClose}
      onEditSeries={() => {}}
    />,
  )
  return { onSubmit, onClose }
}

describe("OccurrenceAmountForm", () => {
  it("começa com escopo somente esta ocorrência", () => {
    renderForm()

    expect(screen.getByRole("radio", { name: /somente esta ocorrência/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Salvar somente Ago 2026" })).toBeDefined()
  })

  it("mostra a personalização apenas no escopo desta ocorrência", async () => {
    renderForm()

    expect(screen.getByText("Personalizar esta ocorrência")).toBeDefined()

    await userEvent.click(screen.getByRole("radio", { name: /esta ocorrência e as próximas/i }))

    expect(screen.queryByText("Personalizar esta ocorrência")).toBeNull()
  })

  it("valida valor vazio", async () => {
    const { onSubmit } = renderForm()

    await userEvent.clear(screen.getByLabelText(/novo valor/i))
    await userEvent.click(screen.getByRole("button", { name: /salvar somente/i }))

    expect(await screen.findByText("Valor deve ser maior que zero")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("envia payload com escopo e valor parseado", async () => {
    const { onSubmit, onClose } = renderForm()

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

  it("envia overrides de pagamento, conta e vencimento nesta ocorrência", async () => {
    const { onSubmit } = renderForm({
      paymentMethodOverride: "CREDIT_CARD",
      cardIdOverride: "card_1",
      bankAccountIdOverride: null,
    })

    const dueDate = screen.getByLabelText(/vencimento/i)
    fireEvent.change(dueDate, { target: { value: "2026-08-20" } })
    await userEvent.click(screen.getByRole("button", { name: /salvar somente/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      scope: "THIS_MONTH",
      paymentMethod: "CREDIT_CARD",
      cardId: "card_1",
      bankAccountId: null,
      dueDate: "2026-08-20",
    })
  })

  it("restaura o padrão da série", async () => {
    const { onSubmit } = renderForm({
      paymentMethodOverride: "CREDIT_CARD",
      cardIdOverride: "card_1",
      dueDate: new Date(2026, 7, 20),
    })

    await userEvent.click(screen.getByRole("button", { name: /restaurar padrão da série/i }))
    await userEvent.click(screen.getByRole("button", { name: /salvar somente/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      scope: "THIS_MONTH",
      paymentMethod: null,
      cardId: null,
      bankAccountId: null,
      dueDate: null,
    })
  })

  it("receita fixa personaliza apenas a conta prevista", () => {
    renderForm({
      fixedCost: {
        type: "INCOME",
        paymentMethod: "PIX",
        paidInsideCard: false,
        cardId: null,
        bankAccountId: "acc_1",
        dueDay: 10,
      },
    })

    expect(screen.queryByLabelText(/forma de pagamento/i)).toBeNull()
    expect(screen.getByLabelText(/conta prevista/i)).toBeDefined()
  })

  it("mostra erro do servidor e permite editar a série", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Ocorrência paga"))
    const onEditSeries = vi.fn()
    render(
      <OccurrenceAmountForm
        occurrence={occurrence}
        cards={cards}
        bankAccounts={bankAccounts}
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
