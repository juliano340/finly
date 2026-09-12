import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

describe("FormField", () => {
  it("associa label ao input e mostra hint", () => {
    render(
      <FormField label="Nome" hint="Opcional">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText(/nome/i)
    expect(input).toBeDefined()
    const hint = screen.getByText("Opcional")
    expect(input.getAttribute("aria-describedby")).toBe(hint.id)
  })

  it("marca aria-invalid e associa o erro", () => {
    render(
      <FormField label="Nome" required error="Nome é obrigatório">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText(/nome/i)
    const alert = screen.getByRole("alert")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(alert).toHaveTextContent("Nome é obrigatório")
    expect(input.getAttribute("aria-describedby")).toBe(alert.id)
  })

  it("não sobrescreve id existente no child", () => {
    render(
      <FormField label="Nome">
        <Input id="custom-id" />
      </FormField>,
    )

    expect(screen.getByLabelText(/nome/i).id).toBe("custom-id")
  })
})
