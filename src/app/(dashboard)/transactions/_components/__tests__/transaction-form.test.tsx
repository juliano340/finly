import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TransactionForm } from "@/app/(dashboard)/transactions/_components/transaction-form"
import type { CategoryWithCount } from "@/features/categories/categories.types"

const categories: CategoryWithCount[] = [
  {
    id: "cat_1",
    name: "Alimentação",
    icon: "utensils",
    color: "#E85D5D",
    type: "EXPENSE",
    userId: "user_1",
    _count: { transactions: 0, budgets: 0 },
  },
]

describe("TransactionForm", () => {
  it("mostra erros de validação ao salvar vazio", async () => {
    const onSubmit = vi.fn()
    render(
      <TransactionForm
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        categories={categories}
        title="Nova transação"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    expect(await screen.findByText("Valor deve ser maior que zero")).toBeDefined()
    expect(screen.getByText("Categoria é obrigatória")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("envia dados validados pelo schema no submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <TransactionForm
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        categories={categories}
        title="Editar transação"
        initial={{
          amount: 150.5,
          type: "EXPENSE",
          categoryId: "cat_1",
          description: "Mercado",
          date: new Date("2026-09-11T12:00:00"),
        }}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      amount: 150.5,
      type: "EXPENSE",
      categoryId: "cat_1",
      description: "Mercado",
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
