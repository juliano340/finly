"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

function GrainOverlay({ theme }: { theme: string }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        opacity: theme === "light" ? 0.015 : 0.035,
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
          "linear-gradient(90deg, transparent, var(--accent-border), transparent)",
      }}
    />
  )
}

function HeroMockup({ theme }: { theme: string }) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const bars = [45, 30, 55, 40, 70, 50, 85, 60, 75, 45, 90, 65]

  return (
    <div
      className="hero-mockup relative rounded-[20px] p-5"
    >
      {/* Sidebar */}
      <div
        className="absolute left-0 top-0 bottom-0 flex w-14 flex-col items-center gap-2.5 py-4"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="mockup-sbar-icon h-8 w-8 rounded-lg"
          />
        ))}
      </div>

      {/* Main */}
      <div className="ml-14">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Saldo total
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight" style={{ color: "var(--fg)" }}>
              R$ 12.480,00
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="mockup-bar flex-1 rounded-t-[2px]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* Cards */}
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          {[
            { label: "Receitas", value: "R$ 8.500", color: "var(--accent)" },
            { label: "Despesas", value: "R$ 3.240", color: "var(--danger)" },
            { label: "Investido", value: "R$ 24.750", color: "var(--accent)" },
          ].map((c) => (
            <div key={c.label} className="mockup-card rounded-xl p-3">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
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
            { label: "Salário", value: "+R$ 5.200", color: "var(--accent)", dot: "var(--accent)" },
            { label: "Aluguel", value: "-R$ 1.400", color: "var(--danger)", dot: "var(--danger)" },
          ].map((tx) => (
            <div key={tx.label} className="mockup-tx-row flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: tx.dot }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>{tx.label}</span>
              </div>
              <span className="text-[11px] font-semibold" style={{ color: tx.color, fontFamily: "ui-monospace, monospace" }}>
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
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2v20M2 12h20" /></svg>,
    title: "Controle total",
    desc: "Conecte contas, cartões e investimentos em um só lugar. Acompanhe tudo sem abrir mil apps.",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    title: "Gráficos claros",
    desc: "Visualize sua evolução financeira com gráficos interativos por mês, categoria e tipo.",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2v20M2 7h20M2 17h20" /></svg>,
    title: "Orçamento inteligente",
    desc: "Defina limites por categoria e receba alertas quando estiver perto de estourar o orçamento.",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    title: "Metas e prazos",
    desc: "Acompanhe consórcios, parcelamentos e economias com prazos visuais e progresso em tempo real.",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M12 9v6" /></svg>,
    title: "Múltiplas contas",
    desc: "Nubank, Itaú, Caixa, Inter — tenha todos os saldos consolidados e veja seu patrimônio total.",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>,
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
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const saved = localStorage.getItem("cinema-theme") as "dark" | "light" | null
    if (saved) setTheme(saved) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    try { localStorage.setItem("cinema-theme", theme) } catch {}
  }, [theme])

  useEffect(() => {
    if (observedRef.current) return
    observedRef.current = true

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible")
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    )
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el))

    const header = document.getElementById("landing-header")
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 40)
    window.addEventListener("scroll", onScroll)

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
                if (current >= target) { current = target; clearInterval(timer) }
                el.textContent = current === 100 ? "100" : target === 1 ? String(current) : current + (target >= 12 ? "+" : "%")
              }, 30)
            })
          }
        })
      },
      { threshold: 0.5 }
    )
    document.querySelectorAll(".stats-grid").forEach((el) => countObserver.observe(el))

    return () => { observer.disconnect(); countObserver.disconnect(); window.removeEventListener("scroll", onScroll) }
  }, [])

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <GrainOverlay theme={theme} />

      <style>{`
        :root {
          --bg: #080B14; --surface: #111827; --fg: #F1F5F9; --fg-secondary: #CBD5E1;
          --muted: #64748B; --border: #1E293B; --accent: #22C55E; --danger: #EF4444;
          --accent-bg: rgba(34,197,94,0.08); --accent-border: rgba(34,197,94,0.25);
          --accent-glow: rgba(34,197,94,0.15);
        }
        [data-theme="light"] {
          --bg: #F8FAFC; --surface: #FFFFFF; --fg: #1E293B; --fg-secondary: #475569;
          --muted: #64748B; --border: #E2E8F0; --accent: #16A34A; --danger: #EF4444;
          --accent-bg: rgba(22,163,74,0.07); --accent-border: rgba(22,163,74,0.2);
          --accent-glow: rgba(22,163,74,0.1);
        }
        html.transitioning * { transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease; }
        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1); }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .hero-gradient::before { content: ''; position: absolute; width: 900px; height: 900px; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 65%); top: 45%; left: 35%; transform: translate(-50%, -50%); pointer-events: none; }
        .hero-gradient::after { content: ''; position: absolute; width: 1400px; height: 1400px; background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 60%); top: 30%; left: 60%; transform: translate(-50%, -50%); pointer-events: none; }
        [data-theme="light"] .hero-gradient::after { background: radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 60%); }
        .feature-card { transition: all 0.4s cubic-bezier(0.22,1,0.36,1); position: relative; overflow: hidden; }
        .feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--accent-border), transparent); opacity: 0; transition: opacity 0.4s; }
        .feature-card:hover { border-color: var(--accent-border); transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        [data-theme="light"] .feature-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
        .feature-card:hover::before { opacity: 1; }
        .cta-glow::before { content: ''; position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        #landing-header { transition: all 0.3s; }
        #landing-header.scrolled { background: color-mix(in srgb, var(--bg) 95%, transparent) !important; border-bottom-color: var(--border) !important; }
        .stat-gradient { background: linear-gradient(135deg, var(--accent) 0%, #4ADE80 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-highlight { background: linear-gradient(135deg, var(--accent) 0%, #4ADE80 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .btn-cinema { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 32px; border-radius: 100px; font: 600 15px/1 -apple-system, BlinkMacSystemFont, sans-serif; cursor: pointer; border: 1px solid transparent; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
        .btn-cinema-primary { background: var(--accent); color: #080B14; border-color: var(--accent); }
        [data-theme="light"] .btn-cinema-primary { color: #fff; }
        .btn-cinema-primary:hover { box-shadow: 0 0 30px var(--accent-glow); filter: brightness(0.9); }
        .btn-cinema-outline { background: transparent; color: var(--fg); border-color: var(--border); }
        .btn-cinema-outline:hover { border-color: var(--accent); color: var(--accent); }
        .mockup-bar { background: linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent)); transition: height 0.6s cubic-bezier(0.22,1,0.36,1); }
        .hero-mockup { background: color-mix(in srgb, var(--surface) 60%, transparent); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid color-mix(in srgb, var(--border) 60%, rgba(255,255,255,0.06)); box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, var(--border) 3%, rgba(255,255,255,0.03)) inset; }
        [data-theme="light"] .hero-mockup { background: rgba(255,255,255,0.85); border-color: var(--border); box-shadow: 0 20px 60px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04) inset; }
        .mockup-sbar-icon { background: color-mix(in srgb, var(--fg) 4%, transparent); border: 1px solid var(--border); }
        .mockup-sbar-icon:first-child { background: var(--accent-bg); border-color: var(--accent-border); box-shadow: 0 0 12px var(--accent-glow); }
        .mockup-card { background: color-mix(in srgb, var(--fg) 3%, var(--surface)); border: 1px solid var(--border); }
        [data-theme="light"] .mockup-card { background: var(--bg); }
        .mockup-tx-row { border-bottom: 1px solid color-mix(in srgb, var(--fg) 3%, var(--border)); }
        .feature-card-box { background: color-mix(in srgb, var(--fg) 2%, var(--surface)); border: 1px solid var(--border); }
        [data-theme="light"] .feature-card-box { background: var(--surface); }
        .theme-toggle { width: 36px; height: 36px; border-radius: 50%; background: transparent; border: 1px solid var(--border); color: var(--muted); cursor: pointer; display: grid; place-items: center; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); font-size: 16px; line-height: 1; }
        .theme-toggle:hover { border-color: var(--accent-border); color: var(--accent); background: var(--accent-bg); }
        .cta-box { background: linear-gradient(135deg, var(--accent-bg) 0%, color-mix(in srgb, var(--bg) 90%, transparent) 100%); border: 1px solid var(--accent-border); }
        [data-theme="light"] .cta-box { background: linear-gradient(135deg, var(--accent-bg) 0%, var(--surface) 100%); }
        .showcase-frame { border: 1px solid var(--border); box-shadow: 0 40px 100px rgba(0,0,0,0.4); }
        [data-theme="light"] .showcase-frame { box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
      `}</style>

      {/* ─── HEADER ─── */}
      <header
        id="landing-header"
        className="fixed left-0 right-0 top-0 z-50"
        style={{
          background: theme === "dark" ? "rgba(8,11,20,0.85)" : "rgba(248,250,252,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "var(--border)"}`,
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 text-[18px] font-bold" style={{ color: "var(--fg)" }}>
            <span className="relative flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-extrabold text-white">
              <span className="relative z-10">F</span>
              <span className="absolute inset-0 rounded-md" style={{ background: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }} />
            </span>
            Finly
          </Link>
          <nav className="flex items-center gap-7">
            <a href="#features" className="text-sm font-medium transition-colors" style={{ color: "var(--muted)" }}>Recursos</a>
            <a href="#showcase" className="text-sm font-medium transition-colors" style={{ color: "var(--muted)" }}>Produto</a>
            <a href="#stats" className="text-sm font-medium transition-colors" style={{ color: "var(--muted)" }}>Números</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Alternar tema">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
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
              <div className="reveal visible mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest" style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} />
                Finanças pessoais
              </div>
              <h1 className="reveal visible mb-5 text-[56px] font-bold leading-[1.1] tracking-[-0.03em]" style={{ color: "var(--fg)" }}>
                Suas finanças.<br />
                <span className="hero-highlight">Em foco.</span>
              </h1>
              <p className="reveal reveal-delay-1 visible mb-9 max-w-[440px] text-[17px] leading-[1.7]" style={{ color: "var(--muted)" }}>
                Acompanhe gastos, organize receitas e veja exatamente onde seu dinheiro está indo — tudo em um só lugar, do seu jeito.
              </p>
              <div className="reveal reveal-delay-2 visible flex flex-wrap gap-3">
                <a href="/register" className="btn-cinema btn-cinema-primary">Criar conta grátis</a>
                <a href="#showcase" className="btn-cinema btn-cinema-outline">Ver como funciona</a>
              </div>
              <div className="reveal reveal-delay-3 visible mt-8 flex items-center gap-5 text-[13px]" style={{ color: "var(--muted)" }}>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M7 1v12M1 7h12" /></svg>
                  Grátis para sempre
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M11 3.5l-5 7L3 7.5" /></svg>
                  Sem cartão de crédito
                </span>
              </div>
            </div>
            <div className="reveal reveal-delay-3 visible">
              <HeroMockup theme={theme} />
            </div>
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── SHOWCASE ─── */}
      <section id="showcase" className="py-20 pb-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="reveal mb-14 text-center">
            <div className="mb-4 inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              Produto
            </div>
            <h2 className="mb-3 text-[40px] font-bold leading-[1.15] tracking-[-0.02em]" style={{ color: "var(--fg)" }}>Veja seu painel financeiro</h2>
            <p className="mx-auto max-w-[520px] text-[17px] leading-[1.7]" style={{ color: "var(--muted)" }}>
              Dashboard completo com resumo mensal, contas, cartões, investimentos e orçamento por categoria.
            </p>
          </div>
          <div className="showcase-frame reveal reveal-delay-1 relative overflow-hidden rounded-[20px]">
            <div className="flex h-[520px] items-center justify-center" style={{ color: "var(--muted)" }}>
              Dashboard interativo em breve
            </div>
          </div>
          <p className="reveal reveal-delay-2 mt-6 text-center text-[15px]" style={{ color: "var(--muted)" }}>
            Dashboard interativo — <strong style={{ color: "var(--fg)" }}>navegue entre transações, orçamentos e relatórios</strong>
          </p>
        </div>
      </section>

      <GradientDivider />

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="reveal mb-14 text-center">
            <div className="mb-4 inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              Recursos
            </div>
            <h2 className="mb-3 text-[40px] font-bold leading-[1.15] tracking-[-0.02em]" style={{ color: "var(--fg)" }}>Tudo na palma da mão</h2>
            <p className="mx-auto max-w-[520px] text-[17px] leading-[1.7]" style={{ color: "var(--muted)" }}>
              Ferramentas pensadas para quem quer cuidar do dinheiro sem perder tempo.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`reveal reveal-delay-${(i % 3) + 1} feature-card feature-card-box rounded-[20px] p-8`}
              >
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}>
                  <div className="h-[22px] w-[22px]">{f.icon}</div>
                </div>
                <h3 className="mb-2 text-[18px] font-semibold leading-[1.3]" style={{ color: "var(--fg)" }}>{f.title}</h3>
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--muted)" }}>{f.desc}</p>
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
                  <span className="stat-count" data-target={s.value}>0</span>{s.suffix}
                </div>
                <div className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── CTA ─── */}
      <section id="cta" className="py-32 pb-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="reveal cta-glow cta-box relative overflow-hidden rounded-[20px] px-16 py-20 text-center">
            <h2 className="relative mb-4 text-[36px] font-bold leading-[1.15]" style={{ color: "var(--fg)" }}>Pronto para colocar suas finanças em foco?</h2>
            <p className="relative mx-auto mb-8 max-w-[420px] text-[16px]" style={{ color: "var(--muted)" }}>
              Crie sua conta em menos de 1 minuto. Grátis. Sem compromisso.
            </p>
            <a href="/register" className="btn-cinema btn-cinema-primary relative !px-10 !py-4 !text-[15px]">
              Criar conta grátis →
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link href="/" className="mb-3 flex items-center gap-2.5 text-[18px] font-bold" style={{ color: "var(--fg)" }}>
                <span className="relative flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-extrabold text-white">
                  <span className="relative z-10">F</span>
                  <span className="absolute inset-0 rounded-md" style={{ background: "var(--accent)" }} />
                </span>
                Finly
              </Link>
              <p className="mt-3 max-w-[280px] text-[14px] leading-[1.6]" style={{ color: "var(--muted)" }}>
                Gerenciador financeiro pessoal simples e poderoso para quem quer cuidar do próprio dinheiro.
              </p>
            </div>
            {[
              { title: "Produto", links: ["Recursos", "Demo", "App Mobile"] },
              { title: "Suporte", links: ["Central de ajuda", "Contato", "Status"] },
              { title: "Legal", links: ["Termos de uso", "Privacidade", "Segurança"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-[14px] font-semibold" style={{ color: "var(--fg)" }}>{col.title}</h4>
                {col.links.map((link) => (
                  <a key={link} href="#" className="mb-2.5 block text-[14px] transition-colors" style={{ color: "var(--muted)" }}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-4 pt-6 text-[13px] md:flex-row" style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}>
            <span>&copy; 2026 Finly. Todos os direitos reservados.</span>
            <span>Feito com cuidado no Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
