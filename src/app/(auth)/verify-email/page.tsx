"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Mail, Send, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const RESEND_COOLDOWN_SECONDS = 10 * 60

type Status = "waiting" | "verifying" | "verified" | "error"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const accountEmail = searchParams.get("email") ?? ""
  const justSent = searchParams.get("sent") === "1"
  const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting")
  const [message, setMessage] = useState("")
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(justSent ? RESEND_COOLDOWN_SECONDS : 0)
  const cooldownRef = useRef<number | null>(null)

  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) {
        window.clearInterval(cooldownRef.current)
        cooldownRef.current = null
      }
      return
    }
    cooldownRef.current = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current)
    }
  }, [cooldown])

  useEffect(() => {
    if (!token) return

    async function verify() {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setStatus("verified")
        return
      }
      setStatus("error")
      setMessage(data.error ?? "Não foi possível confirmar o e-mail.")
    }

    void verify()
  }, [token])

  async function resend() {
    setResending(true)
    setMessage("")
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: accountEmail }),
    })
    const data = await response.json().catch(() => ({}))
    setResending(false)

    if (data.alreadyVerified) {
      setStatus("verified")
      return
    }

    if (!response.ok) {
      if (typeof data.retryAfterMinutes === "number") {
        setCooldown(data.retryAfterMinutes * 60)
        toast.error(data.error ?? "Aguarde alguns minutos antes de solicitar outro link.")
        return
      }
      setStatus("error")
      setMessage(data.error ?? "Não foi possível reenviar o e-mail.")
      return
    }

    setStatus("waiting")
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setMessage(data.message ?? "Enviamos um novo link. Verifique também sua caixa de spam.")
  }

  const minutes = Math.floor(cooldown / 60)
  const seconds = cooldown % 60
  const cooldownLabel = `${minutes}:${String(seconds).padStart(2, "0")}`

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <ThemeToggle className="fixed right-4 top-4" />
      <main className="w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">F</div>
          <span className="text-xl font-bold">Finly</span>
        </Link>

        {status === "verifying" && (
          <div className="text-center">
            <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h1 className="text-2xl font-bold">Confirmando seu e-mail</h1>
            <p className="mt-3 text-muted-foreground">Só um instante.</p>
          </div>
        )}

        {status === "verified" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-primary" />
            <h1 className="text-2xl font-bold">E-mail confirmado</h1>
            <p className="mt-3 text-muted-foreground">Sua conta está ativa. Agora você já pode entrar no Finly.</p>
            <Link href="/login" className="mt-7 block"><Button className="w-full" size="lg">Entrar na minha conta</Button></Link>
          </div>
        )}

        {status !== "verifying" && status !== "verified" && (
          <div className="space-y-6">
            <div className="text-center">
              {status === "error" ? <XCircle className="mx-auto mb-5 h-12 w-12 text-destructive" /> : <Mail className="mx-auto mb-5 h-12 w-12 text-primary" />}
              <h1 className="text-2xl font-bold">Confirme seu e-mail</h1>
              <p className="mt-3 text-muted-foreground">Enviamos um link para ativar sua conta. Verifique sua caixa de entrada e o spam.</p>
            </div>
            {accountEmail && (
              <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                Link enviado para <strong className="text-foreground">{accountEmail}</strong>
              </div>
            )}
            {message && <p className={status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p>}
            <Button type="button" className="w-full" variant="outline" size="lg" disabled={resending || !accountEmail || cooldown > 0} onClick={resend}>
              {cooldown > 0 ? (
                <span>Reenviar em {cooldownLabel}</span>
              ) : (
                <>
                  <Send className="h-4 w-4" /> {resending ? "Enviando..." : "Reenviar link"}
                </>
              )}
            </Button>
            <Link href="/login" className="block"><Button type="button" variant="ghost" className="w-full">Voltar ao login</Button></Link>
          </div>
        )}
      </main>
    </div>
  )
}
