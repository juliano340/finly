"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { signIn, getProviders } from "next-auth/react"
import { RedirectIfLogged } from "@/features/auth/redirect-if-logged"
import { getPasswordStrength, PASSWORD_STRENGTH_COLORS, PASSWORD_STRENGTH_LABELS } from "@/lib/password-strength"

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [objective, setObjective] = useState("")
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null)

  useEffect(() => {
    getProviders().then(setProviders).catch(() => setProviders(null))
  }, [])

  const passwordStrength = getPasswordStrength(password)

  function nextStep() {
    if (step === 1) {
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        toast.error("E-mail inválido")
        return
      }
    }
    if (step === 2) {
      if (password.length < 8) {
        toast.error("Senha deve ter pelo menos 8 caracteres")
        return
      }
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem")
        return
      }
    }
    setStep((s) => s + 1)
  }

  function prevStep() {
    setStep((s) => s - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!terms) {
      toast.error("Aceite os termos para continuar")
      return
    }
    setLoading(true)

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${firstName} ${lastName}`.trim(), email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : "Erro ao criar conta"
      toast.error(msg)
      return
    }

    toast.success("Conta criada. Confirme seu e-mail para entrar.")
    router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&sent=1`)
  }

  return (
    <RedirectIfLogged>
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left - Form */}
      <div className="relative flex items-center justify-center overflow-y-auto p-10">
        <ThemeToggle className="absolute right-4 top-4 z-20" />
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">
              F
            </div>
            <span className="text-xl font-bold">Finly</span>
          </Link>

          <h1 className="mb-2 text-3xl font-bold tracking-tight">Crie sua conta</h1>
          <p className="mb-7 text-muted-foreground">
            Comece a organizar suas finanças em menos de 1 minuto.
          </p>

          {/* Progress Steps */}
          <div className="mb-8 flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary" : i === step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      placeholder="Seu nome"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      placeholder="Sobrenome"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="button" onClick={nextStep} className="w-full" size="lg">
                  Continuar
                </Button>
              </div>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength Indicator */}
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength ? PASSWORD_STRENGTH_COLORS[passwordStrength] : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {password.length === 0
                      ? "Use 8+ caracteres com letras e números"
                      : PASSWORD_STRENGTH_LABELS[passwordStrength]}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="button" onClick={nextStep} className="w-full" size="lg">
                  Continuar
                </Button>
                <Button type="button" variant="ghost" onClick={prevStep} className="w-full">
                  Voltar
                </Button>
              </div>
            )}

            {/* Step 3: Objective & Terms */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objective">Qual seu objetivo principal?</Label>
                  <Select value={objective} onValueChange={(value) => setObjective(value ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="save">Economizar mais</SelectItem>
                      <SelectItem value="invest">Começar a investir</SelectItem>
                      <SelectItem value="control">Controlar gastos</SelectItem>
                      <SelectItem value="debt">Sair das dívidas</SelectItem>
                      <SelectItem value="plan">Planejar o futuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-6">
                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border"
                    />
                    <span>
                      Li e aceito os{" "}
                      <a href="#" className="text-primary hover:underline">
                        Termos de uso
                      </a>{" "}
                      e a{" "}
                      <a href="#" className="text-primary hover:underline">
                        Política de Privacidade
                      </a>
                    </span>
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Criando conta...
                    </span>
                  ) : (
                    "Criar minha conta"
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={prevStep} className="w-full">
                  Voltar
                </Button>
              </div>
            )}
          </form>

          {providers?.google && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => signIn("google", { redirectTo: "/dashboard" })}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Criar conta com Google
              </Button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <a href="/login" className="text-primary hover:underline">
              Entrar
            </a>
          </p>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-[#134E4A] p-10 lg:flex">
        <div className="absolute -right-30 -top-50 h-[600px] w-[600px] rounded-full bg-primary/15" />
        <div className="relative z-10 max-w-md text-white">
          <h2 className="mb-4 text-3xl font-bold">Comece grátis, evolua no seu ritmo</h2>
          <p className="mb-8 text-lg text-white/70">
            Sem cartão de crédito. Sem pegadinhas. Cancele quando quiser.
          </p>
          <div className="space-y-4">
            {[
              "Controle de receitas e despesas",
              "Relatórios visuais e dashboards",
              "Metas e alertas personalizados",
              "Dados criptografados e seguros",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-white/80">
                <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </RedirectIfLogged>
  )
}
