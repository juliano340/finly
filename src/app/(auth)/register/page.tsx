"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, User, Mail, Lock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

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

  const passwordStrength = (() => {
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    return score
  })()

  const strengthLabels = ["", "Fraca", "Razoável", "Boa", "Forte"]
  const strengthColors = ["bg-border", "bg-destructive", "bg-warning", "bg-primary", "bg-primary"]

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

    toast.success("Conta criada com sucesso!")
    router.push("/login?registered=true")
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left - Form */}
      <div className="flex items-center justify-center overflow-y-auto p-10">
        <div className="w-full max-w-md">
          <a href="/" className="mb-8 flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">
              F
            </div>
            <span className="text-xl font-bold">Finly</span>
          </a>

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
                          i <= passwordStrength ? strengthColors[passwordStrength] : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {password.length === 0
                      ? "Use 8+ caracteres com letras e números"
                      : strengthLabels[passwordStrength]}
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
                  <Select value={objective} onValueChange={setObjective}>
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
  )
}
