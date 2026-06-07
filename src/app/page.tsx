import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FileUp,
  PiggyBank,
  Shield,
  TrendingUp,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-100 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">
              F
            </div>
            <span className="text-lg font-bold">Finly</span>
          </div>
          <nav className="flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Recursos
            </a>
            <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Resultados
            </a>
            <a href="#cta" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login">
              <Button variant="ghost">Entrar</Button>
            </a>
            <a href="/register">
              <Button>Começar grátis</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Novo — Relatórios com IA
              </div>
              <h1 className="mb-5 text-5xl font-bold leading-tight tracking-tight">
                Seu dinheiro sob <span className="text-primary">controle</span>, sem complicação
              </h1>
              <p className="mb-8 max-w-xl text-lg text-muted-foreground">
                Gerencie receitas, despesas e investimentos em um só lugar. Simples, rápido e feito para o seu bolso.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/register">
                  <Button size="lg" className="gap-2">
                    Criar conta grátis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a href="/login">
                  <Button variant="outline" size="lg">
                    Já tenho conta
                  </Button>
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 fill-primary text-primary" />
                  Grátis para sempre
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 fill-primary text-primary" />
                  Sem cartão de crédito
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 fill-primary text-primary" />
                  Dados criptografados
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative rounded-2xl border bg-white p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Saldo total</span>
                <span className="text-xs text-muted-foreground">Jun 2026</span>
              </div>
              <div className="mb-1 text-3xl font-bold">R$ 12.480,00</div>
              <div className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-success">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 2l4 5H2l4-5z" />
                </svg>
                +12,5% este mês
              </div>
              <div className="relative mt-4 h-32 overflow-hidden rounded-xl bg-gradient-to-b from-primary/10 to-transparent">
                <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-full w-full">
                  <path
                    d="M0,100 C50,80 100,90 150,60 C200,30 250,50 300,25 C350,10 400,20 400,20 L400,120 L0,120 Z"
                    fill="var(--primary)"
                    opacity="0.15"
                  />
                  <path
                    d="M0,100 C50,80 100,90 150,60 C200,30 250,50 300,25 C350,10 400,20 400,20"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3.5">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">Receitas</div>
                  <div className="text-lg font-bold text-success">R$ 8.500</div>
                </div>
                <div className="rounded-xl bg-muted p-3.5">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">Despesas</div>
                  <div className="text-lg font-bold text-destructive">R$ 3.240</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              Recursos
            </div>
            <h2 className="mb-3 text-4xl font-bold tracking-tight">Tudo que você precisa para cuidar do dinheiro</h2>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              Ferramentas simples e poderosas para você tomar melhores decisões financeiras.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Controle de despesas",
                desc: "Categorize gastos automaticamente e veja para onde seu dinheiro está indo em tempo real.",
              },
              {
                icon: TrendingUp,
                title: "Relatórios visuais",
                desc: "Gráficos interativos que mostram sua evolução financeira mensal, trimestral e anual.",
              },
              {
                icon: PiggyBank,
                title: "Metas financeiras",
                desc: "Defina objetivos de economia e acompanhe o progresso com alertas personalizados.",
              },
              {
                icon: CreditCard,
                title: "Multi-contas",
                desc: "Conecte conta corrente, poupança, cartão e investimentos — tudo sincronizado.",
              },
              {
                icon: Shield,
                title: "Segurança total",
                desc: "Criptografia de ponta a ponta e autenticação em duas etapas para proteger seus dados.",
              },
              {
                icon: FileUp,
                title: "Importação de extratos",
                desc: "Importe CSV e OFX dos seus bancos em segundos. Sem digitar nada.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-white p-8 transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="border-y bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
            <div>
              <div className="mb-2 text-4xl font-bold text-primary">100%</div>
              <div className="text-sm font-medium text-muted-foreground">Online e gratuito</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-primary">Criptografia</div>
              <div className="text-sm font-medium text-muted-foreground">Dados protegidos</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-primary">Sem cartão</div>
              <div className="text-sm font-medium text-muted-foreground">Comece sem pagar nada</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-2xl bg-[#134E4A] px-16 py-16 text-center text-white md:px-20">
            <h2 className="mb-4 text-4xl font-bold">Comece a organizar suas finanças hoje</h2>
            <p className="mx-auto mb-8 max-w-lg text-lg text-white/70">
              Crie sua conta em menos de 1 minuto. Grátis, sem cartão de crédito, sem complicação.
            </p>
            <a href="/register">
              <Button size="lg" className="bg-white text-[#134E4A] hover:bg-primary/10">
                Criar conta grátis
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-extrabold text-white">
                  F
                </div>
                <span className="text-lg font-bold">Finly</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Gerenciador financeiro pessoal simples e poderoso para quem quer cuidar do próprio dinheiro.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Produto</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#features" className="text-sm text-muted-foreground hover:text-primary">Recursos</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Preços</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Integrações</a>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Suporte</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Central de ajuda</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Contato</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Status</a>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Legal</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Termos de uso</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Privacidade</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">Segurança</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground md:flex-row">
            <span>&copy; 2026 Finly. Todos os direitos reservados.</span>
            <span>Feito com cuidado no Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
