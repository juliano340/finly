import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CardForm } from "@/app/(dashboard)/cards/_components/card-form"

const bankAccounts = [
  { id: "acc_1", name: "Nubank" },
  { id: "acc_2", name: "Itaú" },
]

const card = {
  id: "card_1",
  name: "Nubank Platinum",
  brand: "Mastercard",
  color: "#22C55E",
  closingDay: 15,
  dueDay: 10,
  bankAccountId: "acc_1",
}

describe("CardForm", () => {
  it("mostra erro do schema ao salvar sem nome", async () => {
    const onSubmit = vi.fn()
    render(
      <CardForm open onOpenChange={() => {}} bankAccounts={bankAccounts} onSubmit={onSubmit} />,
    )

    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))

    expect(await screen.findByText("Nome é obrigatório")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("envia payload validado na criação", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <CardForm open onOpenChange={onOpenChange} bankAccounts={bankAccounts} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByLabelText(/nome do cartão/i), "  Nubank  ")
    await userEvent.type(screen.getByLabelText(/bandeira/i), "Mastercard")
    await userEvent.type(screen.getByLabelText(/dia fechamento/i), "15")
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "Nubank",
      brand: "Mastercard",
      color: "#22C55E",
      closingDay: 15,
      dueDay: null,
      bankAccountId: null,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("valida dia fora do intervalo na edição", async () => {
    const onSubmit = vi.fn()
    render(
      <CardForm
        open
        onOpenChange={() => {}}
        card={card}
        bankAccounts={bankAccounts}
        onSubmit={onSubmit}
      />,
    )

    const closingDay = screen.getByLabelText("Dia fechamento")
    await userEvent.clear(closingDay)
    await userEvent.type(closingDay, "40")
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    expect(await screen.findByText("Dia deve estar entre 1 e 31")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("mostra erro do servidor no form", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Cartão duplicado"))
    render(
      <CardForm
        open
        onOpenChange={() => {}}
        card={card}
        bankAccounts={bankAccounts}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    expect(await screen.findByText("Cartão duplicado")).toBeDefined()
  })
})
