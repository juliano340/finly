"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { RedirectIfLogged } from "@/features/auth/redirect-if-logged";
import { toast } from "sonner";

function getInitialEmail(): string {
  if (typeof window === "undefined") return ""
  try { return localStorage.getItem("rememberedEmail") ?? "" } catch { return "" }
}

function getInitialRemember(): boolean {
  if (typeof window === "undefined") return true
  try {
    const saved = localStorage.getItem("rememberChoice")
    return saved !== null ? saved === "true" : true
  } catch { return true }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(getInitialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(getInitialRemember);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProviders().then(setProviders).catch(() => setProviders(null));
  }, []);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);
  const REVEAL_DURATION = 3;

  useEffect(() => {
    if (revealSecondsLeft <= 0) return
    const interval = window.setInterval(() => {
      setRevealSecondsLeft((prev) => {
        if (prev <= 0.05) {
          setShowPassword(false)
          return 0
        }
        return prev - 0.05
      })
    }, 50)
    return () => window.clearInterval(interval)
  }, [revealSecondsLeft])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.code === "email_not_verified") {
        toast.error("Conta não confirmada. Verifique seu e-mail para ativar o acesso.");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if (result.code === "oauth_account") {
        toast.error("Esta conta usa Google. Entre com o Google para acessar.");
        return;
      }
      toast.error("Email ou senha inválidos");
      setPassword("");
      passwordRef.current?.focus();
      return;
    }

    if (remember) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }
    localStorage.setItem("rememberChoice", String(remember));

    router.push("/dashboard");
    router.refresh();
  }

  function handleRememberChange(checked: boolean) {
    setRemember(checked);
    localStorage.setItem("rememberChoice", String(checked));
    if (!checked) {
      localStorage.removeItem("rememberedEmail");
    }
  }

  return (
    <RedirectIfLogged>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left - Form */}
      <div className="relative flex items-center justify-center p-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">
              F
            </div>
            <span className="text-xl font-bold">Finly</span>
          </Link>

          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="mb-8 text-muted-foreground">
            Entre na sua conta para continuar gerenciando suas finanças.
          </p>

          <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            Entre com e-mail e senha
            <div className="h-px flex-1 bg-border" />
          </div>

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (showPassword) {
                      setShowPassword(false)
                      setRevealSecondsLeft(0)
                    } else {
                      setShowPassword(true)
                      setRevealSecondsLeft(REVEAL_DURATION)
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  <span className="relative inline-flex h-7 w-7 items-center justify-center">
                    {showPassword && (
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 28 28">
                        <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="1.5"
                          strokeDasharray={2 * Math.PI * 12}
                          strokeDashoffset={2 * Math.PI * 12 * (1 - revealSecondsLeft / REVEAL_DURATION)}
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => handleRememberChange(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                    suppressHydrationWarning
                  />
                Lembrar de mim
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Esqueci a senha
              </Link>
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
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </span>
              )}
            </Button>

            {providers?.google && (
              <>
                <div className="my-4 flex items-center gap-3">
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
                  Continuar com Google
                </Button>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <a href="/register" className="text-primary hover:underline">
              Criar conta grátis
            </a>
          </p>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-[#134E4A] p-10 lg:flex">
        <div className="absolute -right-30 -top-50 h-[600px] w-[600px] rounded-full bg-primary/15" />
        <div className="absolute -bottom-30 -left-20 h-[400px] w-[400px] rounded-full bg-primary/10" />
        <div className="relative z-10 max-w-md text-white">
          <h2 className="mb-4 text-3xl font-bold">
            Organize suas finanças com inteligência
          </h2>
          <p className="text-lg leading-relaxed text-white/70">
            Acompanhe receitas, despesas e investimentos em um painel simples e
            visual. Tome decisões melhores com relatórios em tempo real.
          </p>
        </div>
      </div>
      </div>
    </RedirectIfLogged>
  );
}
