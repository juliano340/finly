"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        opacity: 0.035,
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    />
  )
}

function GradientDivider() {
  return (
    <div
      className="h-px"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(34,197,94,0.25), transparent)",
      }}
    />
  )
}

function HeroMockup() {
  const bars = [45, 30, 55, 40, 70, 50, 85, 60, 75, 45, 90, 65]

  return (
    <div
      className="relative rounded-[20px] p-5"
      style={{
        background: "rgba(17,24,39,0.6)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow:
          "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      {/* Sidebar */}
      <div
        className="absolute left-0 top-0 bottom-0 flex w-14 flex-col items-center gap-2.5 py-4"
        style={{ borderRight: "1px solid #1E293B" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-8 rounded-lg"
            style={{
              background: i === 0 ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === 0 ? "rgba(34,197,94,0.25)" : "#1E293B"}`,
              boxShadow: i === 0 ? "0 0 12px rgba(34,197,94,0.15)" : "none",
            }}
          />
        ))}
      </div>

      {/* Main */}
      <div className="ml-14">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
              Saldo total
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-[#F1F5F9]">
              R$ 12.480,00
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#22C55E]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 10V4M4 7l3-3 3 3" />
            </svg>
            +12,5% este mês
          </div>
        </div>

        {/* Chart bars */}
        <div className="mb-3 flex h-20 items-end gap-[3px] overflow-hidden rounded-lg px-0.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[2px]"
              style={{
                height: `${h}%`,
                background:
                  "linear-gradient(to top, #22C55E, rgba(34,197,94,0.3))",
                transition: `height 0.6s cubic-bezier(0.22,1,0.36,1) ${0.05 * i}s`,
              }}
            />
          ))}
        </div>

        {/* Cards */}
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          {[
            { label: "Receitas", value: "R$ 8.500", color: "#22C55E" },
            { label: "Despesas", value: "R$ 3.240", color: "#EF4444" },
            { label: "Investido", value: "R$ 24.750", color: "#22C55E" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #1E293B",
              }}
            >
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
                {c.label}
              </div>
              <div className="text-sm font-bold" style={{ color: c.color }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="space-y-1.5">
          {[
            { label: "Salário", value: "+R$ 5.200", color: "#22C55E", dot: "#22C55E" },
            { label: "Aluguel", value: "-R$ 1.400", color: "#EF4444", dot: "#EF4444" },
          ].map((tx) => (
            <div
              key={tx.label}
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: tx.dot }}
                />
                <span className="text-[11px] font-medium text-[#64748B]">
                  {tx.label}
                </span>
              </div>
              <span
                className="text-[11px] font-semibold"
                style={{ color: tx.color, fontFamily: "ui-monospace, monospace" }}
              >
                {tx.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
    title: "Controle total",
    desc: "Conecte contas, cartões e investimentos em um só lugar. Acompanhe tudo sem abrir mil apps.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: "Gráficos claros",
    desc: "Visualize sua evolução financeira com gráficos interativos por mês, categoria e tipo.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 2v20M2 7h20M2 17h20" />
      </svg>
    ),
    title: "Orçamento inteligente",
    desc: "Defina limites por categoria e receba alertas quando estiver perto de estourar o orçamento.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Metas e prazos",
    desc: "Acompanhe consórcios, parcelamentos e economias com prazos visuais e progresso em tempo real.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    ),
    title: "Múltiplas contas",
    desc: "Nubank, Itaú, Caixa, Inter — tenha todos os saldos consolidados e veja seu patrimônio total.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "100% gratuito",
    desc: "Sem planos escondidos, sem limite de transações. Use de graça para sempre, sem surpresas.",
  },
]

const stats = [
  { value: "100", suffix: "%", label: "gratuito — sem taxas" },
  { value: "12", suffix: "+", label: "Contas consolidadas" },
  { value: "99", suffix: "%", label: "disponibilidade" },
  { value: "1", suffix: "", label: "Minuto para começar" },
]

export default function HomePage() {
  const observedRef = useRef<boolean>(false)

  useEffect(() => {
    if (observedRef.current) return
    observedRef.current = true

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    )

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el))

    // Header scroll
    const header = document.getElementById("landing-header")
    const onScroll = () => {
      header?.classList.toggle("scrolled", window.scrollY > 40)
    }
    window.addEventListener("scroll", onScroll)

    // Count-up
    let counted = false
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !counted) {
            counted = true
            document.querySelectorAll(".stat-count").forEach((el) => {
              const target = parseInt(el.getAttribute("data-target") ?? "0", 10)
              let current = 0
              const step = Math.max(1, Math.floor(target / 40))
              const timer = setInterval(() => {
                current += step
                if (current >= target) {
                  current = target
                  clearInterval(timer)
                }
                el.textContent =
                  current === 100
                    ? "100"
                    : target === 1
                      ? String(current)
                      : current + (target >= 12 ? "+" : "%")
              }, 30)
            })
          }
        })
      },
      { threshold: 0.5 }
    )
    document.querySelectorAll(".stats-grid").forEach((el) => countObserver.observe(el))

    return () => {
      observer.disconnect()
      countObserver.disconnect()
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#080B14", color: "#F1F5F9" }}>
      <GrainOverlay />

      <style>{`
        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1); }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .hero-gradient::before {
          content: ''; position: absolute; width: 900px; height: 900px;
          background: radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 65%);
          top: 45%; left: 35%; transform: translate(-50%, -50%); pointer-events: none;
        }
        .hero-gradient::after {
          content: ''; position: absolute; width: 1400px; height: 1400px;
          background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 60%);
          top: 30%; left: 60%; transform: translate(-50%, -50%); pointer-events: none;
        }
        .feature-card { transition: all 0.4s cubic-bezier(0.22,1,0.36,1); position: relative; overflow: hidden; }
        .feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(34,197,94,0.25), transparent); opacity: 0; transition: opacity 0.4s; }
        .feature-card:hover { border-color: rgba(34,197,94,0.2); transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .feature-card:hover::before { opacity: 1; }
        .cta-glow::before { content: ''; position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        #landing-header { transition: all 0.3s; }
        #landing-header.scrolled { background: rgba(8,11,20,0.95) !important; border-bottom-color: #1E293B !important; }
        .stat-gradient { background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-highlight { background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .btn-cinema { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 32px; border-radius: 100px; font: 600 15px/1 -apple-system, BlinkMacSystemFont, sans-serif; cursor: pointer; border: 1px solid transparent; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
        .btn-cinema-primary { background: #22C55E; color: #080B14; border-color: #22C55E; }
        .btn-cinema-primary:hover { background: #16A34A; border-color: #16A34A; box-shadow: 0 0 30px rgba(34,197,94,0.15); }
        .btn-cinema-outline { background: transparent; color: #F1F5F9; border-color: #1E293B; }
        .btn-cinema-outline:hover { border-color: #22C55E; color: #22C55E; }
        .mockup-bar { transition: height 0.6s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      {/* ─── HEADER ─── */}
      <header
        id="landing-header"
        className="fixed left-0 right-0 top-0 z-50"
        style={{
          background: "rgba(8,11,20,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5 text-[18px] font-bold text-[#F1F5F9]">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-extrabold text-white">
              <span className="relative z-10">F</span>
              <span
                className="absolute inset-0 rounded-md"
                style={{ background: "#22C55E", boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}
              />
            </span>
            Finly
          </a>
          <nav className="flex items-center gap-7">
            <a href="#features" className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#F1F5F9]">Recursos</a>
            <a href="#showcase" className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#F1F5F9]">Produto</a>
            <a href="#stats" className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#F1F5F9]">Números</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="btn-cinema btn-cinema-outline !py-2.5 !px-6 !text-[13px]">Entrar</a>
            <a href="/register" className="btn-cinema btn-cinema-primary !py-2.5 !px-6 !text-[13px]">Começar grátis</a>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero-gradient relative flex min-h-screen items-center">
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-24">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="reveal visible mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22C55E" }}>
                <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_#22C55E]" style={{ background: "#22C55E" }} />
                Finanças pessoais
              </div>
              <h1 className="reveal visible mb-5 text-[56px] font-bold leading-[1.1] tracking-[-0.03em]">
                Suas finanças.<br />
                <span className="hero-highlight">Em foco.</span>
              </h1>
              <p className="reveal reveal-delay-1 visible mb-9 max-w-[440px] text-[17px] leading-[1.7] text-[#64748B]">
                Acompanhe gastos, organize receitas e veja exatamente onde seu dinheiro está indo — tudo em um só lugar, do seu jeito.
              </p>
              <div className="reveal reveal-delay-2 visible flex flex-wrap gap-3">
                <a href="/register" className="btn-cinema btn-cinema-primary">Criar conta grátis</a>
                <a href="#showcase" className="btn-cinema btn-cinema-outline">Ver como funciona</a>
              </div>
              <div className="reveal reveal-delay-3 visible mt-8 flex items-center gap-5 text-[13px] text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M7 1v12M1 7h12" /></svg>
                  Grátis para sempre
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M11 3.5l-5 7L3 7.5" /></svg>
                  Sem cartão de crédito
                </span>
              </div>
            </div>

            <div className="reveal reveal-delay-3 visible hero-visual">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── SHOWCASE ─── */}
      <section id="showcase" className="py-20 pb-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="reveal mb-14 text-center">
            <div className="mb-4 inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22C55E" }}>
              Produto
            </div>
            <h2 className="mb-3 text-[40px] font-bold leading-[1.15] tracking-[-0.02em]">Veja seu painel financeiro</h2>
            <p className="mx-auto max-w-[520px] text-[17px] leading-[1.7] text-[#64748B]">
              Dashboard completo com resumo mensal, contas, cartões, investimentos e orçamento por categoria.
            </p>
          </div>
          <div
            className="reveal reveal-delay-1 relative overflow-hidden rounded-[20px]"
            style={{ border: "1px solid #1E293B", boxShadow: "0 40px 100px rgba(0,0,0,0.4)" }}
          >
            <div className="flex h-[520px] items-center justify-center text-[#64748B]">
              Dashboard interativo em breve
            </div>
          </div>
          <p className="reveal reveal-delay-2 mt-6 text-center text-[15px] text-[#64748B]">
            Dashboard interativo — <strong className="text-[#F1F5F9]">navegue entre transações, orçamentos e relatórios</strong>
          </p>
        </div>
      </section>

      <GradientDivider />

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="reveal mb-14 text-center">
            <div className="mb-4 inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22C55E" }}>
              Recursos
            </div>
            <h2 className="mb-3 text-[40px] font-bold leading-[1.15] tracking-[-0.02em]">Tudo na palma da mão</h2>
            <p className="mx-auto max-w-[520px] text-[17px] leading-[1.7] text-[#64748B]">
              Ferramentas pensadas para quem quer cuidar do dinheiro sem perder tempo.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`reveal reveal-delay-${(i % 3) + 1} feature-card rounded-[20px] p-8`}
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1E293B" }}
              >
                <div
                  className="mb-5 grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <div className="h-[22px] w-[22px]">{f.icon}</div>
                </div>
                <h3 className="mb-2 text-[18px] font-semibold leading-[1.3]">{f.title}</h3>
                <p className="text-[14px] leading-[1.6] text-[#64748B]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── STATS ─── */}
      <section id="stats" className="relative py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="stats-grid grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className={`reveal reveal-delay-${i + 1}`}>
                <div className="stat-gradient mb-2 text-[40px] font-bold">
                  <span className="stat-count" data-target={s.value}>0</span>
                  {s.suffix}
                </div>
                <div className="text-[13px] font-medium text-[#64748B]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── CTA ─── */}
      <section id="cta" className="py-32 pb-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div
            className="reveal cta-glow relative overflow-hidden rounded-[20px] px-16 py-20 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.04) 0%, rgba(8,11,20,0.9) 100%)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <h2 className="relative mb-4 text-[36px] font-bold leading-[1.15]">Pronto para colocar suas finanças em foco?</h2>
            <p className="relative mx-auto mb-8 max-w-[420px] text-[16px] text-[#64748B]">
              Crie sua conta em menos de 1 minuto. Grátis. Sem compromisso.
            </p>
            <a href="/register" className="btn-cinema btn-cinema-primary relative !px-10 !py-4 !text-[15px]">
              Criar conta grátis →
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: "1px solid #1E293B" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <a href="/" className="mb-3 flex items-center gap-2.5 text-[18px] font-bold text-[#F1F5F9]">
                <span className="relative flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-extrabold text-white">
                  <span className="relative z-10">F</span>
                  <span className="absolute inset-0 rounded-md" style={{ background: "#22C55E" }} />
                </span>
                Finly
              </a>
              <p className="mt-3 max-w-[280px] text-[14px] leading-[1.6] text-[#64748B]">
                Gerenciador financeiro pessoal simples e poderoso para quem quer cuidar do próprio dinheiro.
              </p>
            </div>
            {[
              { title: "Produto", links: ["Recursos", "Demo", "App Mobile"] },
              { title: "Suporte", links: ["Central de ajuda", "Contato", "Status"] },
              { title: "Legal", links: ["Termos de uso", "Privacidade", "Segurança"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-[14px] font-semibold">{col.title}</h4>
                {col.links.map((link) => (
                  <a key={link} href="#" className="mb-2.5 block text-[14px] text-[#64748B] transition-colors hover:text-[#F1F5F9]">
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-4 pt-6 text-[13px] text-[#64748B] md:flex-row" style={{ borderTop: "1px solid #1E293B" }}>
            <span>&copy; 2026 Finly. Todos os direitos reservados.</span>
            <span>Feito com cuidado no Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
