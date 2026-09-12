import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GoogleAuthButton } from "@/components/google-auth-button"

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }))
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }))

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    mocks.signIn.mockReset()
    mocks.toastError.mockReset()
  })

  it("inicia o fluxo do Google e mostra loading com o botão desabilitado", async () => {
    mocks.signIn.mockImplementation(() => new Promise(() => {}))
    render(<GoogleAuthButton label="Continuar com Google" />)

    await userEvent.click(screen.getByRole("button", { name: /continuar com google/i }))

    expect(mocks.signIn).toHaveBeenCalledWith("google", { redirect: false, redirectTo: "/dashboard" })
    expect(screen.getByRole("button", { name: /redirecionando/i })).toBeDisabled()
  })

  it("restaura o estado e sinaliza falha quando o signIn retorna sem redirect", async () => {
    mocks.signIn.mockResolvedValue({ error: "OAuthSignin", url: null })
    render(<GoogleAuthButton label="Criar conta com Google" />)

    await userEvent.click(screen.getByRole("button", { name: /criar conta com google/i }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("button", { name: /criar conta com google/i })).not.toBeDisabled()
  })

  it("restaura o estado e sinaliza falha quando o signIn lança erro", async () => {
    mocks.signIn.mockRejectedValue(new Error("network error"))
    render(<GoogleAuthButton label="Continuar com Google" />)

    await userEvent.click(screen.getByRole("button", { name: /continuar com google/i }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("button", { name: /continuar com google/i })).not.toBeDisabled()
  })
})
