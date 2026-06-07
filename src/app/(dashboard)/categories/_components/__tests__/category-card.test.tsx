import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CategoryCard } from "@/app/(dashboard)/categories/_components/category-card"

const mockCategory = {
  id: "cat_1",
  name: "Alimentação",
  icon: "utensils",
  color: "#E85D5D",
  type: "EXPENSE" as const,
  userId: "user_1",
  _count: { transactions: 12, budgets: 2 },
}

describe("CategoryCard", () => {
  it("renderiza nome e emoji", () => {
    render(
      <CategoryCard
        category={mockCategory}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Alimentação")).toBeDefined()
    expect(screen.getByText("🍽️")).toBeDefined()
  })

  it("renderiza badge de Despesa", () => {
    render(
      <CategoryCard
        category={mockCategory}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Despesa")).toBeDefined()
  })

  it("renderiza badge de Receita quando type=INCOME", () => {
    render(
      <CategoryCard
        category={{ ...mockCategory, type: "INCOME" }}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Receita")).toBeDefined()
  })

  it("mostra contagem de transações", () => {
    render(
      <CategoryCard
        category={mockCategory}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText(/12 transações/)).toBeDefined()
  })

  it("chama onEdit ao clicar no lápis", async () => {
    let called = false
    render(
      <CategoryCard
        category={mockCategory}
        onEdit={() => {
          called = true
        }}
        onDelete={() => {}}
      />
    )
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[0])
    expect(called).toBe(true)
  })

  it("chama onDelete ao clicar na lixeira", async () => {
    let called = false
    render(
      <CategoryCard
        category={mockCategory}
        onEdit={() => {}}
        onDelete={() => {
          called = true
        }}
      />
    )
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])
    expect(called).toBe(true)
  })
})
