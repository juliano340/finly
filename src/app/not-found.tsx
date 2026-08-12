import Link from "next/link"
import {
  ArrowLeft,
  CircleDollarSign,
  LayoutDashboard,
  MapPinOff,
  ReceiptText,
} from "lucide-react"

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-background px-6 py-8 sm:px-10 lg:px-16">
      <div aria-hidden="true" className="absolute -left-28 -top-28 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-36 -right-24 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/20">
              F
            </span>
            <span className="text-lg font-bold tracking-tight">Finly</span>
          </Link>
          <span className="rounded-full border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            Página não encontrada
          </span>
        </header>

        <section className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <MapPinOff className="size-3.5" aria-hidden="true" />
              Erro 404
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
              Esta rota saiu do orçamento.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              A página que você procura não existe, mudou de endereço ou não está mais disponível. Seus dados financeiros continuam seguros — só este caminho que não fechou a conta.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transform-none"
              >
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Ir para o dashboard
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transform-none"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar ao início
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Dica: confira o endereço digitado ou use uma das opções acima.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
            <div className="absolute -inset-5 rotate-3 rounded-[2rem] border border-primary/15 bg-primary/5" />
            <div className="relative overflow-hidden rounded-[1.75rem] border bg-card/95 p-6 shadow-2xl shadow-foreground/10 backdrop-blur sm:p-8">
              <div className="flex items-center justify-between border-b border-dashed pb-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ReceiptText className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Extrato de navegação</p>
                    <p className="text-xs text-muted-foreground">Tentativa mais recente</p>
                  </div>
                </div>
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Não localizado</span>
              </div>

              <div className="py-8 text-center">
                <p className="font-mono text-7xl font-black tracking-[-0.08em] text-primary/15 sm:text-8xl">404</p>
                <div className="mx-auto -mt-2 grid size-16 place-items-center rounded-2xl border bg-background text-muted-foreground shadow-sm">
                  <CircleDollarSign className="size-8" />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-muted/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Destino</span>
                  <span className="font-medium text-foreground">Página desconhecida</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Resultado</span>
                  <span className="font-medium text-destructive">Rota inválida</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-dashed pt-3">
                  <span className="font-medium text-foreground">Impacto nos seus dados</span>
                  <span className="font-bold text-primary">R$ 0,00</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground sm:text-left">
          Finly · Controle financeiro simples e seguro
        </footer>
      </div>
    </main>
  )
}
