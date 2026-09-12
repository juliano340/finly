import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FixedCostForm } from "@/app/(dashboard)/fixed-costs/_components/fixed-cost-form"

const categories = [{ id: "cat_1", name: "Moradia" }]
const cards = [{ id: "card_1", name: "Nubank", dueDay: 10 }]
const bankAccounts = [{ id: "acc_1", name: "Itaú" }]

function renderForm(overrides: Partial<Parameters<typeof FixedCostForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(
    <FixedCostForm
      mode="create"
      type="EXPENSE"
      categories={categories}
      cards={cards}
      bankAccounts={bankAccounts}
      onSubmit={onSubmit}
      onClose={onClose}
      {...overrides}
    />,
  )
  return { onSubmit, onClose }
}

describe("FixedCostForm", () => {
  it("mostra erros do schema ao salvar vazio", async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    expect(await screen.findByText("Nome é obrigatório")).toBeDefined()
    expect(screen.getByText("Valor deve ser maior que zero")).toBeDefined()
    expect(screen.getByText("Categoria é obrigatória")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("monta o preview da recorrência com valor, vencimento e frequência", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText(/valor padrão/i), "120")
    await userEvent.type(screen.getByLabelText(/dia de vencimento/i), "10")

    expect(screen.getByText(/R\$ 120,00 · todo dia 10 · mensal · a partir de/)).toBeDefined()
  })

  it("esconde a forma de pagamento para receita fixa", () => {
    renderForm({ type: "INCOME" })

    expect(screen.queryByLabelText(/forma de pagamento/i)).toBeNull()
    expect(screen.getByLabelText(/conta prevista/i)).toBeDefined()
  })

  it("envia cartão de crédito como paidInsideCard no modo série", async () => {
    const { onSubmit, onClose } = renderForm({
      mode: "series",
      initial: {
        name: "Streaming",
        categoryId: "cat_1",
        paymentMethod: "CREDIT_CARD",
        dueDay: 10,
        cardId: "card_1",
        bankAccountId: null,
        active: true,
        startDate: "2026-01-01T00:00:00.000Z",
        frequency: "MONTHLY",
        customInterval: null,
        customUnit: null,
        endType: "NONE",
        endDate: null,
        endAfterCount: null,
      },
    })

    await userEvent.click(screen.getByRole("button", { name: /salvar configurações da série/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "Streaming",
      type: "EXPENSE",
      paymentMethod: "CREDIT_CARD",
      paidInsideCard: true,
      cardId: "card_1",
      bankAccountId: null,
      dueDay: 10,
      frequency: "MONTHLY",
      endType: "NONE",
      active: true,
    })
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("defaultAmount")
    expect(onClose).toHaveBeenCalled()
  })

  it("usa o mês atual como mês de início padrão na criação", () => {
    renderForm()

    const currentMonth = new Date().toISOString().slice(0, 7)
    expect(screen.getByLabelText(/mês de início/i)).toHaveValue(currentMonth)
    expect(screen.queryByLabelText(/data de início/i)).toBeNull()
  })

  it("mantém data completa para frequência semanal", () => {
    renderForm({
      mode: "series",
      initial: {
        name: "Faxina",
        categoryId: "cat_1",
        paymentMethod: "PIX",
        dueDay: null,
        cardId: null,
        bankAccountId: null,
        active: true,
        startDate: "2026-01-15T00:00:00.000Z",
        frequency: "WEEKLY",
        customInterval: null,
        customUnit: null,
        endType: "NONE",
        endDate: null,
        endAfterCount: null,
      },
    })

    expect(screen.getByLabelText(/data de início/i)).toHaveValue("2026-01-15")
    expect(screen.queryByLabelText(/mês de início/i)).toBeNull()
  })

  it("preserva o dia armazenado quando o mês não muda", async () => {
    const { onSubmit } = renderForm({
      mode: "series",
      initial: {
        name: "Internet",
        categoryId: "cat_1",
        paymentMethod: "PIX",
        dueDay: 10,
        cardId: null,
        bankAccountId: null,
        active: true,
        startDate: "2026-01-15T00:00:00.000Z",
        frequency: "MONTHLY",
        customInterval: null,
        customUnit: null,
        endType: "NONE",
        endDate: null,
        endAfterCount: null,
      },
    })

    await userEvent.click(screen.getByRole("button", { name: /salvar configurações da série/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ startDate: "2026-01-15" })
  })

  it("grava dia 01 quando o mês de início muda", async () => {
    const { onSubmit } = renderForm({
      mode: "series",
      initial: {
        name: "Internet",
        categoryId: "cat_1",
        paymentMethod: "PIX",
        dueDay: 10,
        cardId: null,
        bankAccountId: null,
        active: true,
        startDate: "2026-01-15T00:00:00.000Z",
        frequency: "MONTHLY",
        customInterval: null,
        customUnit: null,
        endType: "NONE",
        endDate: null,
        endAfterCount: null,
      },
    })

    fireEvent.change(screen.getByLabelText(/mês de início/i), { target: { value: "2026-02" } })
    await userEvent.click(screen.getByRole("button", { name: /salvar configurações da série/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ startDate: "2026-02-01" })
  })

  it("mostra erro do servidor no form", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Cadastro duplicado"))
    render(
      <FixedCostForm
        mode="series"
        type="EXPENSE"
        categories={categories}
        cards={cards}
        bankAccounts={bankAccounts}
        initial={{
          name: "Streaming",
          categoryId: "cat_1",
          paymentMethod: "PIX",
          dueDay: null,
          cardId: null,
          bankAccountId: null,
          active: true,
          startDate: "2026-01-01T00:00:00.000Z",
          frequency: "MONTHLY",
          customInterval: null,
          customUnit: null,
          endType: "NONE",
          endDate: null,
          endAfterCount: null,
        }}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar configurações da série/i }))

    expect(await screen.findByText("Cadastro duplicado")).toBeDefined()
  })
})
