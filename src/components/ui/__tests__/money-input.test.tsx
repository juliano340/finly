import { describe, it, expect, vi } from "vitest"
import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoneyInput } from "@/components/ui/money-input"

function Harness({ error }: { error?: string }) {
  const [value, setValue] = useState("")
  return <MoneyInput label="Valor" value={value} onValueChange={setValue} error={error} />
}

describe("MoneyInput", () => {
  it("sanitiza a digitação e normaliza no blur", async () => {
    render(<Harness />)
    const input = screen.getByLabelText(/valor/i)

    await userEvent.type(input, "1a2b,5")
    expect(input).toHaveValue("12,5")

    await userEvent.tab()
    expect(input).toHaveValue("12,50")
  })

  it("mostra prefixo R$", () => {
    render(<Harness />)
    expect(screen.getByText("R$")).toBeDefined()
  })

  it("associa erro ao input com role e aria", () => {
    render(<Harness error="Valor inválido" />)
    const input = screen.getByLabelText(/valor/i)

    expect(input).toHaveAttribute("aria-invalid", "true")
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Valor inválido")
    expect(input.getAttribute("aria-describedby")).toBe(alert.id)
  })

  it("chama onValueChange com valor sanitizado", async () => {
    const onValueChange = vi.fn()
    function SpyHarness() {
      const [value, setValue] = useState("")
      return (
        <MoneyInput
          label="Valor"
          value={value}
          onValueChange={(next) => {
            setValue(next)
            onValueChange(next)
          }}
        />
      )
    }
    render(<SpyHarness />)

    await userEvent.type(screen.getByLabelText(/valor/i), "9x9")
    expect(onValueChange).toHaveBeenLastCalledWith("99")
  })
})
