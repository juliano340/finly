import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RedirectIfLogged } from "../redirect-if-logged"

const authState = vi.hoisted(() => ({
  status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated",
  replace: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: authState.status }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: authState.replace }),
}))

describe("RedirectIfLogged", () => {
  beforeEach(() => {
    authState.status = "unauthenticated"
    authState.replace.mockClear()
  })

  it("mostra o login quando não há sessão", () => {
    render(<RedirectIfLogged><span>Formulário de login</span></RedirectIfLogged>)

    expect(screen.getByText("Formulário de login")).toBeInTheDocument()
    expect(authState.replace).not.toHaveBeenCalled()
  })

  it("redireciona a sessão autenticada sem mostrar o login", async () => {
    authState.status = "authenticated"
    render(<RedirectIfLogged><span>Formulário de login</span></RedirectIfLogged>)

    expect(screen.queryByText("Formulário de login")).not.toBeInTheDocument()
    await waitFor(() => expect(authState.replace).toHaveBeenCalledWith("/dashboard"))
  })

  it("aguarda a verificação da sessão sem mostrar o login", () => {
    authState.status = "loading"
    render(<RedirectIfLogged><span>Formulário de login</span></RedirectIfLogged>)

    expect(screen.queryByText("Formulário de login")).not.toBeInTheDocument()
    expect(authState.replace).not.toHaveBeenCalled()
  })
})
