import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FileUp,
  PiggyBank,
  Shield,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Finly</span>
        </div>
        <nav className="flex items-center gap-4">
          <a
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Entrar
          </a>
          <a href="/register">
            <Button size="sm">
              Criar conta grátis
            </Button>
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-xs font-medium">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Controle financeiro simplificado
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Suas finanças sob{" "}
          <span className="text-primary">controle</span>, sem complicação
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground sm:text-lg">
          Registre receitas e despesas, defina orçamentos, importe extratos e
          visualize tudo em gráficos claros. Do jeito simples.
        </p>
        <div className="mt-8 flex gap-4">
          <a href="/register">
            <Button size="lg" className="gap-2">
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <a href="/login">
            <Button variant="outline" size="lg">
              Já tenho conta
            </Button>
          </a>
        </div>
        <div className="mt-12 w-full max-w-4xl overflow-hidden rounded-xl border shadow-2xl">
          <div className="flex h-10 items-center gap-2 border-b bg-muted/50 px-4">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-muted-foreground">
              app.finly.app/dashboard
            </span>
          </div>
          <div className="flex h-64 items-center justify-center bg-gradient-to-br from-[#1E3B4A] to-[#0EA882]/10 p-8">
            <div className="grid w-full max-w-md grid-cols-3 gap-3">
              {[
                { label: "Saldo", value: "R$ 3.250,00", color: "bg-primary/10 text-primary" },
                { label: "Receitas", value: "R$ 6.800,00", color: "bg-emerald-50 text-emerald-600" },
                { label: "Despesas", value: "R$ 3.550,00", color: "bg-red-50 text-red-600" },
              ].map((c) => (
                <div key={c.label} className="rounded-lg bg-white p-3 text-left shadow-sm">
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  <p className="text-xs font-bold">{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold">
            Tudo que você precisa
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            Funcionalidades pensadas pra simplificar sua vida financeira
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Dashboard visual",
                desc: "Gráficos e cards que mostram exatamente pra onde seu dinheiro vai.",
              },
              {
                icon: PiggyBank,
                title: "Orçamentos",
                desc: "Defina limites por categoria e receba alertas quando estiver perto de estourar.",
              },
              {
                icon: FileUp,
                title: "Importação CSV/OFX",
                desc: "Importe extratos bancários em segundos. Sem digitar nada.",
              },
              {
                icon: CreditCard,
                title: "Categorias customizadas",
                desc: "Organize do seu jeito com ícones e cores pra cada categoria.",
              },
              {
                icon: Shield,
                title: "Seus dados seguros",
                desc: "Cada usuário vê apenas seus próprios dados. Isolamento total.",
              },
              {
                icon: TrendingUp,
                title: "Relatórios mensais",
                desc: "Compare mês a mês e veja sua evolução financeira.",
              },
            ].map((f) => (
              <Card key={f.title} className="border-0 p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-[#1E3B4A] px-6 py-20 text-center text-white">
        <h2 className="text-3xl font-bold">
          Pronto pra organizar suas finanças?
        </h2>
        <p className="mt-2 text-white/70">
          Grátis para começar. Upgrade quando precisar.
        </p>
        <a href="/register" className="mt-8 inline-block">
          <Button size="lg" className="gap-2">
            Criar conta gratuita
            <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-10 text-center text-sm text-muted-foreground">
        <p>Finly © {new Date().getFullYear()} — Controle financeiro pessoal</p>
      </footer>
    </div>
  )
}
