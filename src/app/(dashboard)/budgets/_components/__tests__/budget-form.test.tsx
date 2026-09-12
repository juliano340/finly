import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BudgetForm } from "@/app/(dashboard)/budgets/_components/budget-form"

const categories = [
  { id: "cat_1", name: "Alimentação", color: "#E85D5D" },
  { id: "cat_2", name: "Transporte", color: "#3B82F6" },
]

describe("BudgetForm", () => {
  it("mostra erros do schema ao salvar vazio", async () => {
    const onSubmit = vi.fn()
    render(
      <BudgetForm
        open
        onOpenChange={() => {}}
        categories={categories}
        onSubmit={onSubmit}
        month="2026-09"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /criar/i }))

    expect(await screen.findByText("Valor deve ser maior que zero")).toBeDefined()
    expect(screen.getByText("Categoria é obrigatória")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("envia valor parseado e mês no submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <BudgetForm
        open
        onOpenChange={onOpenChange}
        categories={categories}
        initialData={{ id: "budget_1", amount: 500, categoryId: "cat_1" }}
        onSubmit={onSubmit}
        month="2026-09"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ amount: 500, categoryId: "cat_1", month: "2026-09" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("mostra erro do servidor no form", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Erro ao salvar orçamento"))
    render(
      <BudgetForm
        open
        onOpenChange={() => {}}
        categories={categories}
        initialData={{ id: "budget_1", amount: 500, categoryId: "cat_1" }}
        onSubmit={onSubmit}
        month="2026-09"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    expect(await screen.findByText("Erro ao salvar orçamento")).toBeDefined()
  })
})
