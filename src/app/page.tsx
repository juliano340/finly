"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { ShowcaseMockup } from "./(marketing)/_components/showcase-mockup"

const features = [
  {
    title: "Controle total",
    desc: "Conecte contas, cartões e investimentos em um só lugar. Acompanhe tudo sem abrir mil apps.",
    icon: (
      <svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: "Gráficos claros",
    desc: "Visualize sua evolução financeira com gráficos interativos por mês, categoria e tipo.",
    icon: (
      <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  {
    title: "Orçamento inteligente",
    desc: "Defina limites por categoria e receba alertas quando estiver perto de estourar o orçamento.",
    icon: (
      <svg viewBox="0 0 24 24"><path d="M12 2v20M2 7h20M2 17h20" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: "Metas e prazos",
    desc: "Acompanhe consórcios, parcelamentos e economias com prazos visuais e progresso em tempo real.",
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeLinecap="round" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: "Múltiplas contas",
    desc: "Nubank, Itaú, Caixa, Inter — tenha todos os saldos consolidados e veja seu patrimônio total.",
    icon: (
      <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" strokeLinecap="round" /><path d="M9 12h6M12 9v6" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: "100% gratuito",
    desc: "Sem planos escondidos, sem limite de transações. Use de graça para sempre, sem surpresas.",
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
]

const stats = [
  { value: "100", suffix: "%", label: "gratuito — sem taxas" },
  { value: "12", suffix: "+", label: "Contas consolidadas" },
  { value: "99", suffix: "%", label: "disponibilidade" },
  { value: "1", suffix: "", label: "Minuto para começar" },
]

const footerColumns = [
  { title: "Produto", links: [{ label: "Recursos", href: "#recursos" }, { label: "Changelog", href: "/changelog" }] },
  { title: "Legal", links: [{ label: "Termos de uso", href: "/termos-de-uso" }, { label: "Privacidade", href: "/privacidade" }] },
]

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const theme = (resolvedTheme === "light" ? "light" : "dark") as "dark" | "light"

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible")
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    )
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el))

    const header = document.getElementById("header")
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 40)
    window.addEventListener("scroll", onScroll)

    let counted = false
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !counted) {
            counted = true
            document.querySelectorAll(".stat-value[data-count]").forEach((el) => {
              const target = parseInt(el.getAttribute("data-count") ?? "0", 10)
              let current = 0
              const step = Math.max(1, Math.floor(target / 40))
              const timer = setInterval(() => {
                current += step
                if (current >= target) { current = target; clearInterval(timer) }
                el.textContent = current === 100 ? "100" : (target === 1 ? String(current) : current + (target >= 12 ? "+" : "%"))
              }, 30)
            })
          }
        })
      },
      { threshold: 0.5 }
    )
    document.querySelectorAll(".stats-grid").forEach((el) => countObserver.observe(el))

    if (window.location.hash) {
      const target = document.querySelector(window.location.hash)
      if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth" }))
    }

    return () => { observer.disconnect(); countObserver.disconnect(); window.removeEventListener("scroll", onScroll) }
  }, [])

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)", color: "var(--fg)" }} suppressHydrationWarning>
      <div className="grain-overlay" />

      <style>{`
        :root {
          --bg: #080B14; --surface: #111827; --fg: #F1F5F9; --fg-secondary: #CBD5E1;
          --muted: #64748B; --border: #1E293B; --accent: #22C55E; --danger: #EF4444;
          --accent-bg: rgba(34,197,94,0.08); --accent-border: rgba(34,197,94,0.25);
          --accent-glow: rgba(34,197,94,0.15); --accent-dark: #16A34A;
          --radius-xs: 8px; --radius-sm: 12px; --radius-md: 20px; --radius-pill: 100px;
          --font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
          --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-theme="light"] {
          --bg: #F8FAFC; --surface: #FFFFFF; --fg: #1E293B; --fg-secondary: #475569;
          --muted: #64748B; --border: #E2E8F0; --accent: #16A34A;
          --accent-bg: rgba(22,163,74,0.07); --accent-border: rgba(22,163,74,0.2);
          --accent-glow: rgba(22,163,74,0.1); --accent-dark: #15803D;
        }
        html.transitioning * { transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease; }
        .grain-overlay {
          position: fixed; inset: 0; z-index: 9999;
          pointer-events: none; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 256px 256px;
        }
        [data-theme="light"] .grain-overlay { opacity: 0.015; }

        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out); }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        /* ─── Header ─── */
        .header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(8,11,20,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: all 0.3s;
        }
        .header.scrolled {
          background: rgba(8,11,20,0.95);
          border-bottom-color: var(--border);
        }
        [data-theme="light"] .header {
          background: rgba(248,250,252,0.85);
          border-bottom-color: var(--border);
        }
        [data-theme="light"] .header.scrolled {
          background: rgba(248,250,252,0.95);
        }
        .header-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: var(--fg); letter-spacing: -0.01em; }
        .logo-icon { width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center; font-weight: 800; font-size: 13px; position: relative; }
        .logo-icon::before { content: 'F'; position: relative; z-index: 2; color: #fff; }
        .logo-icon::after { content: ''; position: absolute; inset: 0; background: var(--accent); border-radius: inherit; box-shadow: 0 0 20px var(--accent-glow); }
        .nav { display: flex; align-items: center; gap: 28px; }
        .nav a { color: var(--muted); font-size: 14px; font-weight: 500; }
        .nav a:hover { color: var(--fg); }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 24px; border-radius: var(--radius-pill);
          font: 600 14px/1 -apple-system, BlinkMacSystemFont, sans-serif;
          cursor: pointer; border: 1px solid transparent;
          transition: all 0.25s var(--ease-out);
          text-decoration: none;
        }
        .btn-primary { background: var(--accent); color: #080B14; border-color: var(--accent); }
        [data-theme="light"] .btn-primary { color: #fff; }
        .btn-primary:hover { background: var(--accent-dark); border-color: var(--accent-dark); box-shadow: 0 0 30px var(--accent-glow); }
        .btn-outline { background: transparent; color: var(--fg); border-color: var(--border); }
        .btn-outline:hover { border-color: var(--accent); color: var(--accent); }
        .btn-lg { padding: 14px 32px; font-size: 15px; }

        .theme-toggle {
          width: 36px; height: 36px; border-radius: 50%;
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); cursor: pointer;
          display: grid; place-items: center;
          transition: all 0.25s var(--ease-out);
          font-size: 16px; line-height: 1;
        }
        .theme-toggle:hover { border-color: var(--accent-border); color: var(--accent); background: var(--accent-bg); }

        /* ─── Hero ─── */
        .hero { min-height: 100vh; display: flex; align-items: center; position: relative; overflow: hidden; }
        .hero::before {
          content: ''; position: absolute;
          width: 900px; height: 900px;
          background: radial-gradient(circle, var(--accent-glow) 0%, transparent 65%);
          top: 45%; left: 35%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .hero::after {
          content: ''; position: absolute;
          width: 1400px; height: 1400px;
          background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 60%);
          top: 30%; left: 60%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        [data-theme="light"] .hero::after { background: radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 60%); }
        .hero-grid {
          position: relative; z-index: 2;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: center;
          padding: 100px 0 0;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: var(--radius-pill);
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          font: 600 12px/1 -apple-system, BlinkMacSystemFont, sans-serif;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 24px;
        }
        .hero-badge::before {
          content: '';
          width: 5px; height: 5px;
          background: var(--accent); border-radius: 50%;
          box-shadow: 0 0 8px var(--accent);
        }
        .hero h1 {
          font: 700 56px/1.1 var(--font-display);
          letter-spacing: -0.03em;
          color: var(--fg);
          margin-bottom: 20px;
        }
        .hero h1 .highlight {
          background: linear-gradient(135deg, var(--accent) 0%, #4ADE80 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero p { font-size: 17px; color: var(--muted); line-height: 1.7; margin-bottom: 36px; max-width: 440px; }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .hero-meta { display: flex; align-items: center; gap: 20px; margin-top: 32px; font-size: 13px; color: var(--muted); }
        .hero-meta-item { display: flex; align-items: center; gap: 6px; }
        .hero-meta-item svg { width: 14px; height: 14px; stroke: var(--accent); fill: none; stroke-width: 2; }

        .hero-visual { position: relative; }
        .hero-dashboard-mockup {
          background: rgba(17,24,39,0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-md);
          padding: 20px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset;
          position: relative;
          min-height: 300px;
        }
        .hero-mockup-sidebar {
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 56px; padding: 16px 10px;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .hero-mockup-sbar-icon {
          width: 32px; height: 32px; border-radius: var(--radius-xs);
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
        }
        .hero-mockup-sbar-icon.active {
          background: var(--accent-bg);
          border-color: var(--accent-border);
          box-shadow: 0 0 12px var(--accent-glow);
        }
        .hero-mockup-main { margin-left: 56px; }
        .hero-mockup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .hero-mockup-greeting { font: 600 12px/1 -apple-system, BlinkMacSystemFont, sans-serif; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .hero-mockup-amount { font: 700 24px/1 var(--font-display); letter-spacing: -0.02em; margin-top: 4px; color: var(--fg); }
        .hero-mockup-change { font: 600 12px/1 -apple-system, BlinkMacSystemFont, sans-serif; color: var(--accent); display: flex; align-items: center; gap: 4px; }
        .mockup-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 12px; }
        .mockup-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; }
        .mockup-card-label { font: 500 10px/1 -apple-system, BlinkMacSystemFont, sans-serif; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
        .mockup-card-value { font: 700 16px/1 var(--font-display); color: var(--fg); }
        .mockup-card-value.green { color: var(--accent); }
        .mockup-card-value.red { color: var(--danger); }
        .mockup-chart { margin-top: 12px; height: 80px; position: relative; overflow: hidden; border-radius: var(--radius-xs); }
        .mockup-bars { display: flex; align-items: flex-end; gap: 3px; height: 100%; padding: 0 2px; }
        .mockup-bar { flex: 1; border-radius: 2px 2px 0 0; background: linear-gradient(to top, var(--accent), rgba(34,197,94,0.3)); min-height: 4px; transition: height 0.6s var(--ease-out); }
        .mockup-transactions { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .mockup-tx-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .mockup-tx-left { display: flex; align-items: center; gap: 8px; }
        .mockup-tx-dot { width: 6px; height: 6px; border-radius: 50%; }
        .mockup-tx-label { font: 500 11px/1 -apple-system, BlinkMacSystemFont, sans-serif; color: var(--muted); }
        .mockup-tx-value { font: 600 11px/1 var(--font-mono); }
        .mockup-tx-value.green { color: var(--accent); }
        .mockup-tx-value.red { color: var(--danger); }

        [data-theme="light"] .hero-dashboard-mockup {
          background: rgba(255,255,255,0.85);
          border-color: var(--border);
          box-shadow: 0 20px 60px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04) inset;
        }
        [data-theme="light"] .hero-mockup-sbar-icon { background: rgba(0,0,0,0.03); border-color: var(--border); }
        [data-theme="light"] .hero-mockup-sbar-icon.active { background: var(--accent-bg); border-color: var(--accent-border); }
        [data-theme="light"] .mockup-card { background: var(--bg); }
        [data-theme="light"] .mockup-tx-row { border-bottom-color: var(--border); }

        .gradient-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--accent-border), transparent); margin: 0; }

        /* ─── Sections ─── */
        section { position: relative; }
        .section-padding { padding: 100px 0; }
        .section-tag {
          display: inline-flex; padding: 6px 14px; border-radius: var(--radius-pill);
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          font: 600 11px/1 -apple-system, BlinkMacSystemFont, sans-serif;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 16px;
        }
        .section-header { text-align: center; margin-bottom: 56px; }
        .section-header h2 {
          font: 700 40px/1.15 var(--font-display);
          letter-spacing: -0.02em;
          margin-bottom: 12px;
          color: var(--fg);
        }
        .section-header p {
          font-size: 17px; color: var(--muted);
          max-width: 520px; margin: 0 auto; line-height: 1.7;
        }

        /* ─── Showcase ─── */
        .showcase { padding: 80px 0 120px; }
        .showcase-frame {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 40px 100px rgba(0,0,0,0.4);
          height: 560px;
        }
        .showcase-frame > div { height: 100%; }
        [data-theme="light"] .showcase-frame { box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
        .showcase-caption { text-align: center; margin-top: 24px; }
        .showcase-caption p { font-size: 15px; color: var(--muted); }
        .showcase-caption strong { color: var(--fg); }

        /* ─── Features ─── */
        .features { padding: 120px 0; position: relative; }
        .features::before {
          content: ''; position: absolute;
          width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-border), transparent);
          top: 0; left: 0;
        }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .feature-card {
          padding: 32px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: all 0.4s var(--ease-out);
          position: relative; overflow: hidden;
        }
        [data-theme="light"] .feature-card { background: var(--surface); }
        .feature-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-border), transparent);
          opacity: 0; transition: opacity 0.4s;
        }
        .feature-card:hover { border-color: var(--accent-border); transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        [data-theme="light"] .feature-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon {
          width: 44px; height: 44px; border-radius: var(--radius-sm);
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          display: grid; place-items: center;
          margin-bottom: 20px;
        }
        .feature-icon svg { width: 22px; height: 22px; stroke: var(--accent); fill: none; stroke-width: 1.5; }
        .feature-card h3 {
          font: 600 18px/1.3 var(--font-display);
          margin-bottom: 8px;
          color: var(--fg);
        }
        .feature-card p { font-size: 14px; color: var(--muted); line-height: 1.6; }

        /* ─── Stats ─── */
        .stats { padding: 100px 0; position: relative; }
        .stats::before, .stats::after {
          content: ''; position: absolute;
          width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-border), transparent);
        }
        .stats::before { top: 0; }
        .stats::after { bottom: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center; }
        .stat-value {
          font: 700 40px/1 var(--font-display);
          background: linear-gradient(135deg, var(--accent) 0%, #4ADE80 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }
        .stat-label { font: 500 13px/1 -apple-system, BlinkMacSystemFont, sans-serif; color: var(--muted); }

        /* ─── CTA ─── */
        .cta { padding: 120px 0 100px; }
        .cta-box {
          border-radius: var(--radius-md);
          padding: 80px 60px;
          text-align: center;
          position: relative;
          background: linear-gradient(135deg, rgba(34,197,94,0.04) 0%, rgba(8,11,20,0.9) 100%);
          border: 1px solid var(--accent-border);
          overflow: hidden;
        }
        [data-theme="light"] .cta-box { background: linear-gradient(135deg, rgba(22,163,74,0.04) 0%, var(--surface) 100%); }
        .cta-box::before {
          content: ''; position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .cta-box h2 {
          font: 700 36px/1.15 var(--font-display);
          margin-bottom: 16px;
          position: relative;
          color: var(--fg);
        }
        .cta-box p {
          font-size: 16px; color: var(--muted);
          margin-bottom: 32px;
          max-width: 420px; margin-left: auto; margin-right: auto;
          position: relative;
        }
        .cta-box .btn-primary { background: var(--accent); color: #080B14; border-color: var(--accent); position: relative; font-size: 15px; padding: 16px 40px; }
        [data-theme="light"] .cta-box .btn-primary { color: #fff; }
        .cta-box .btn-primary:hover { box-shadow: 0 0 50px var(--accent-glow); }

        /* ─── Footer ─── */
        .footer { padding: 60px 0 32px; border-top: 1px solid var(--border); }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .footer-brand p { font-size: 14px; color: var(--muted); margin-top: 12px; max-width: 280px; line-height: 1.6; }
        .footer-col h4 { font: 600 14px/1 var(--font-display); margin-bottom: 16px; color: var(--fg); }
        .footer-col a { display: block; font-size: 14px; color: var(--muted); margin-bottom: 10px; text-decoration: none; }
        .footer-col a:hover { color: var(--fg); }
        .footer-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 24px; border-top: 1px solid var(--border);
          font-size: 13px; color: var(--muted);
        }

        /* ─── Responsive ─── */
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .hero-visual { display: none; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .section-header h2 { font-size: 32px; }
        }
        @media (max-width: 640px) {
          .header-inner { height: 56px; }
          .header-actions { gap: 8px !important; }
          .header .btn { padding: 8px 12px; font-size: 13px; }
          .header .btn-primary { padding: 8px 10px; white-space: nowrap; flex-shrink: 0; }
          .hero { min-height: auto; padding: 100px 0 60px; }
          .hero h1 { font-size: 32px; }
          .hero p { font-size: 16px; }
          .nav { display: none; }
          .features-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr; gap: 24px; }
          .cta-box { padding: 40px 24px; }
          .cta-box h2 { font-size: 28px; }
          .footer { padding: 48px 0 24px; }
          .footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 24px; margin-bottom: 32px; }
          .footer-brand { grid-column: 1 / -1; }
          .footer-brand p { max-width: 340px; }
          .footer-col h4 { margin-bottom: 14px; }
          .footer-col a { margin-bottom: 12px; }
          .footer-bottom { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; align-items: start; }
          .section-header h2 { font-size: 28px; }
          .showcase-frame { height: 420px; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <header id="header" className="header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            <span className="logo-icon"></span>
            Finly
          </Link>
          <nav className="nav">
            <a href="#recursos">Recursos</a>
            <a href="#showcase">Produto</a>
            <a href="#numeros">Números</a>
          </nav>
          <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="theme-toggle" aria-label="Alternar tema" suppressHydrationWarning onClick={toggleTheme}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <Link href="/login" className="btn btn-outline">Entrar</Link>
            <Link href="/register" className="btn btn-primary">Começar grátis</Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="hero-badge reveal visible">Finanças pessoais</div>
              <h1 className="reveal visible">
                Suas finanças.<br />
                <span className="highlight">Em foco.</span>
              </h1>
              <p className="reveal visible reveal-delay-1">Acompanhe gastos, organize receitas e veja exatamente onde seu dinheiro está indo — tudo em um só lugar, do seu jeito.</p>
              <div className="hero-actions reveal visible reveal-delay-2">
                <Link href="/register" className="btn btn-primary btn-lg">Criar conta grátis</Link>
                <a href="#showcase" className="btn btn-outline btn-lg">Ver como funciona</a>
              </div>
              <div className="hero-meta reveal visible reveal-delay-3">
                <div className="hero-meta-item">
                  <svg viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" /></svg>
                  Grátis para sempre
                </div>
                <div className="hero-meta-item">
                  <svg viewBox="0 0 14 14"><path d="M11 3.5l-5 7L3 7.5" /></svg>
                  Sem cartão de crédito
                </div>
              </div>
            </div>
            <div className="hero-visual reveal visible reveal-delay-3">
              <div className="hero-dashboard-mockup">
                <div className="hero-mockup-sidebar">
                  <div className="hero-mockup-sbar-icon active"></div>
                  <div className="hero-mockup-sbar-icon"></div>
                  <div className="hero-mockup-sbar-icon"></div>
                  <div className="hero-mockup-sbar-icon"></div>
                </div>
                <div className="hero-mockup-main">
                  <div className="hero-mockup-header">
                    <div>
                      <div className="hero-mockup-greeting">Saldo total</div>
                      <div className="hero-mockup-amount">R$ 12.480,00</div>
                    </div>
                    <div className="hero-mockup-change">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10V4M4 7l3-3 3 3" /></svg>
                      +12,5% este mês
                    </div>
                  </div>
                  <div className="mockup-chart">
                    <div className="mockup-bars">
                      {[45, 30, 55, 40, 70, 50, 85, 60, 75, 45, 90, 65].map((h, i) => (
                        <div key={i} className="mockup-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="mockup-cards">
                    <div className="mockup-card">
                      <div className="mockup-card-label">Receitas</div>
                      <div className="mockup-card-value green">R$ 8.500</div>
                    </div>
                    <div className="mockup-card">
                      <div className="mockup-card-label">Despesas</div>
                      <div className="mockup-card-value red">R$ 3.240</div>
                    </div>
                    <div className="mockup-card">
                      <div className="mockup-card-label">Investido</div>
                      <div className="mockup-card-value green">R$ 24.750</div>
                    </div>
                  </div>
                  <div className="mockup-transactions">
                    <div className="mockup-tx-row">
                      <div className="mockup-tx-left">
                        <div className="mockup-tx-dot" style={{ background: "var(--accent)" }}></div>
                        <span className="mockup-tx-label">Salário</span>
                      </div>
                      <span className="mockup-tx-value green">+R$ 5.200</span>
                    </div>
                    <div className="mockup-tx-row">
                      <div className="mockup-tx-left">
                        <div className="mockup-tx-dot" style={{ background: "var(--danger)" }}></div>
                        <span className="mockup-tx-label">Aluguel</span>
                      </div>
                      <span className="mockup-tx-value red">-R$ 1.400</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="gradient-divider" />

      {/* ─── SHOWCASE ─── */}
      <section className="showcase" id="showcase">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-tag">Produto</div>
            <h2>Veja seu painel financeiro</h2>
            <p>Dashboard completo com resumo mensal, contas, cartões, investimentos e orçamento por categoria.</p>
          </div>
          <div className="showcase-frame reveal reveal-delay-1">
            <ShowcaseMockup />
          </div>
          <div className="showcase-caption reveal reveal-delay-2">
            <p>Dashboard interativo — <strong>navegue entre transações, orçamentos e relatórios</strong></p>
          </div>
        </div>
      </section>

      <div className="gradient-divider" />

      {/* ─── FEATURES ─── */}
      <section className="features" id="recursos">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-tag">Recursos</div>
            <h2>Tudo na palma da mão</h2>
            <p>Ferramentas pensadas para quem quer cuidar do dinheiro sem perder tempo.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={f.title} className={`reveal reveal-delay-${(i % 3) + 1} feature-card`}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gradient-divider" />

      {/* ─── STATS ─── */}
      <section className="stats" id="numeros">
        <div className="container">
          <div className="stats-grid">
            {stats.map((s, i) => (
              <div key={s.label} className={`reveal reveal-delay-${i + 1}`}>
                <div className="stat-value" data-count={s.value}>0</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gradient-divider" />

      {/* ─── CTA ─── */}
      <section className="cta" id="cta">
        <div className="container">
          <div className="cta-box reveal">
            <h2>Pronto para colocar suas finanças em foco?</h2>
            <p>Crie sua conta em menos de 1 minuto. Grátis. Sem compromisso.</p>
            <Link href="/register" className="btn btn-primary btn-lg">Criar conta grátis →</Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand reveal">
              <Link href="/" className="logo">
                <span className="logo-icon"></span>
                Finly
              </Link>
              <p>Gerenciador financeiro pessoal simples e poderoso para quem quer cuidar do próprio dinheiro.</p>
            </div>
            {footerColumns.map((col, idx) => (
              <div key={col.title} className={`footer-col reveal reveal-delay-${idx + 1}`}>
                <h4>{col.title}</h4>
                {col.links.map((link) => (
                  <Link key={link.label} href={link.href}>{link.label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <span>© 2026 Finly. Todos os direitos reservados.</span>
            <span>Feito com cuidado no Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
