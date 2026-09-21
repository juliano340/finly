"use client"

import { useEffect, useState } from "react"
import { Download, Share } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [standalone, setStandalone] = useState(true)

  useEffect(() => {
    setStandalone(isStandaloneDisplay()) // eslint-disable-line react-hooks/set-state-in-effect
    setIos(isIos())

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setPromptEvent(null)
      setStandalone(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  if (standalone || (!promptEvent && !ios)) return null

  const handleInstall = async () => {
    if (!promptEvent) return

    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === "accepted") {
      setPromptEvent(null)
      setStandalone(true)
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Aplicativo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Instale o Finly na tela inicial para abrir em tela cheia, como um app.
        </p>
        {promptEvent ? (
          <Button onClick={handleInstall}>
            <Download className="mr-2 h-4 w-4" /> Instalar app
          </Button>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Share className="mt-0.5 h-4 w-4 shrink-0" />
            No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
