import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import NotFound from "../not-found"

describe("NotFound", () => {
  it("oferece caminhos claros para recuperação", () => {
    render(<NotFound />)

    expect(screen.getByRole("heading", { name: "Esta rota saiu do orçamento." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ir para o dashboard/i })).toHaveAttribute("href", "/dashboard")
    expect(screen.getByRole("link", { name: /voltar ao início/i })).toHaveAttribute("href", "/")
  })
})
