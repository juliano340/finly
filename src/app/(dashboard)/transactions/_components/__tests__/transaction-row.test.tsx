import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TransactionRow } from "@/app/(dashboard)/transactions/_components/transaction-row"

const mockTx = {
  id: "tx_1",
  amount: 150.5,
  type: "EXPENSE" as const,
  description: "Supermercado",
  date: new Date("2026-06-04T12:00:00"),
  categoryId: "cat_1",
  userId: "user_1",
  category: { id: "cat_1", name: "Alimentação", color: "#E85D5D", icon: "utensils" },
}

describe("TransactionRow", () => {
  it("renderiza descrição e categoria", () => {
    render(
      <TransactionRow
        transaction={mockTx}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Supermercado")).toBeDefined()
    expect(screen.getByText(/Alimentação/)).toBeDefined()
  })

  it("renderiza valor formatado com sinal negativo para despesa", () => {
    render(
      <TransactionRow
        transaction={mockTx}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("- R$ 150,50")).toBeDefined()
  })

  it("renderiza valor positivo para receita", () => {
    render(
      <TransactionRow
        transaction={{ ...mockTx, type: "INCOME", amount: 5000 }}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("+ R$ 5.000,00")).toBeDefined()
  })

  it("renderiza badge de Despesa", () => {
    render(
      <TransactionRow
        transaction={mockTx}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Despesa")).toBeDefined()
  })

  it("chama onEdit ao clicar no lápis", async () => {
    let called = false
    render(
      <TransactionRow
        transaction={mockTx}
        onEdit={() => {
          called = true
        }}
        onDelete={() => {}}
      />
    )
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[buttons.length - 2])
    expect(called).toBe(true)
  })

  it("chama onDelete ao clicar na lixeira", async () => {
    let called = false
    render(
      <TransactionRow
        transaction={mockTx}
        onEdit={() => {}}
        onDelete={() => {
          called = true
        }}
      />
    )
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[buttons.length - 1])
    expect(called).toBe(true)
  })
})
