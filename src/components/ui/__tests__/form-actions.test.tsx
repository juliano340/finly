import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormActions } from "@/components/ui/form-actions"

describe("FormActions", () => {
  it("chama onCancel e submete", async () => {
    const onCancel = vi.fn()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <FormActions onCancel={onCancel} />
      </form>,
    )

    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("mostra estado de loading e desabilita o submit", () => {
    render(<FormActions onCancel={() => {}} loading />)

    const submit = screen.getByRole("button", { name: /salvando/i })
    expect(submit).toBeDisabled()
  })
})
