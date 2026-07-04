"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "sonner"

const RESEND_COOLDOWN_SECONDS = 10 * 60

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [cooldown, setCooldown] = useState(0)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (res.status === 429) {
      const data = await res.json()
      toast.error(data.error ?? "Aguarde alguns minutos antes de tentar novamente.")
      return
    }

    setSubmitted(true)
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  const minutes = Math.floor(cooldown / 60)
  const seconds = cooldown % 60
  const cooldownLabel = `${minutes}:${String(seconds).padStart(2, "0")}`

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative flex items-center justify-center p-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">
              F
            </div>
            <span className="text-xl font-bold">Finly</span>
          </Link>

          <h1 className="mb-2 text-3xl font-bold tracking-tight">Esqueci a senha</h1>
          <p className="mb-8 text-muted-foreground">
            Digite seu email e enviaremos um link para você redefinir sua senha.
          </p>

          {submitted ? (
            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium">Verifique seu email</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se o email <strong className="text-foreground">{email}</strong> estiver
                  cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada e
                  a pasta de spam.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={cooldown > 0 || loading}
                  onClick={handleSubmit}
                >
                  {cooldown > 0 ? (
                    <span>Reenviar em {cooldownLabel}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Reenviar link
                    </span>
                  )}
                </Button>
                <Link href="/login">
                  <Button type="button" variant="ghost" className="w-full" size="lg">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviar link de recuperação
                  </span>
                )}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden bg-[#134E4A] p-10 lg:flex">
        <div className="absolute -right-30 -top-50 h-[600px] w-[600px] rounded-full bg-primary/15" />
        <div className="absolute -bottom-30 -left-20 h-[400px] w-[400px] rounded-full bg-primary/10" />
        <div className="relative z-10 max-w-md text-white">
          <h2 className="mb-4 text-3xl font-bold">
            Recupere o acesso à sua conta
          </h2>
          <p className="text-lg leading-relaxed text-white/70">
            Enviaremos um link seguro para o seu email. O link expira em 30 minutos por segurança.
          </p>
        </div>
      </div>
    </div>
  )
}