import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PwaInstallPrompt } from "@/components/pwa-install-prompt"

const originalUserAgent = navigator.userAgent

function mockStandalone(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  })
}

function createInstallPromptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: string }>
  }
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}

describe("PwaInstallPrompt", () => {
  beforeEach(() => {
    mockStandalone(false)
    setUserAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setUserAgent(originalUserAgent)
  })

  it("oferece instalar quando o navegador dispara beforeinstallprompt", async () => {
    render(<PwaInstallPrompt />)

    const event = createInstallPromptEvent()
    act(() => {
      window.dispatchEvent(event)
    })

    const button = await screen.findByRole("button", { name: /instalar app/i })
    await userEvent.click(button)

    expect(event.prompt).toHaveBeenCalledTimes(1)
  })

  it("mostra instrução de Adicionar à Tela de Início no iOS", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")

    render(<PwaInstallPrompt />)

    expect(await screen.findByText(/Adicionar à Tela de Início/)).toBeInTheDocument()
  })

  it("mostra o caminho pelo menu quando o Android ainda não ofereceu o prompt", async () => {
    render(<PwaInstallPrompt />)

    expect(await screen.findByText(/toque no menu/i)).toBeInTheDocument()
  })

  it("não aparece quando o app já roda instalado", () => {
    mockStandalone(true)

    render(<PwaInstallPrompt />)

    expect(screen.queryByText(/Instale o Finly/)).not.toBeInTheDocument()
  })

  it("não aparece em navegador sem suporte a instalação", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0")

    render(<PwaInstallPrompt />)

    expect(screen.queryByText(/Instale o Finly/)).not.toBeInTheDocument()
  })
})
