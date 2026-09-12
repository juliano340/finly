import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CategoryForm } from "@/app/(dashboard)/categories/_components/category-form"

describe("CategoryForm", () => {
  it("mostra erro do schema ao salvar vazio", async () => {
    const onSubmit = vi.fn()
    render(
      <CategoryForm open onOpenChange={() => {}} onSubmit={onSubmit} title="Nova categoria" />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    expect(await screen.findByText("Nome é obrigatório")).toBeDefined()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("envia dados validados com nome normalizado", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <CategoryForm
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        title="Editar categoria"
        initial={{ name: "  Alimentação  ", type: "EXPENSE", icon: "utensils", color: "#E85D5D" }}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "Alimentação",
      type: "EXPENSE",
      icon: "utensils",
      color: "#E85D5D",
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("mostra erro do servidor no form", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Categoria duplicada"))
    render(
      <CategoryForm
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        title="Nova categoria"
        initial={{ name: "Alimentação", type: "EXPENSE" }}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    expect(await screen.findByText("Categoria duplicada")).toBeDefined()
  })
})
