"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import type { ReactNode } from "react"

const footerColumns = [
  { title: "Produto", links: [{ label: "Recursos", href: "/#recursos" }, { label: "Changelog", href: "/changelog" }] },
  { title: "Legal", links: [{ label: "Termos de uso", href: "/termos-de-uso" }, { label: "Privacidade", href: "/privacidade" }] },
]

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()
  const theme = resolvedTheme === "light" ? "light" : "dark"

  return (
    <div className="flex min-h-screen flex-col">
      <style>{`
        .public-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(8,11,20,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: all 0.3s;
        }
        [data-theme="light"] .public-header {
          background: rgba(248,250,252,0.85);
          border-bottom-color: var(--border);
        }
        .public-header-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .public-logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: var(--foreground); letter-spacing: -0.01em; text-decoration: none; }
        .public-logo-icon {
          width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center;
          font-weight: 800; font-size: 13px; position: relative; color: #fff;
        }
        .public-logo-icon::after {
          content: ''; position: absolute; inset: 0; background: var(--accent); border-radius: inherit;
          box-shadow: 0 0 20px var(--accent-glow);
        }
        .public-logo-icon span { position: relative; z-index: 2; }
        .public-nav { display: flex; align-items: center; gap: 28px; }
        .public-nav a { color: var(--muted-foreground); font-size: 14px; font-weight: 500; text-decoration: none; }
        .public-nav a:hover { color: var(--foreground); }
        .public-actions { display: flex; align-items: center; gap: 12px; }
        .public-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 24px; border-radius: 9999px;
          font: 600 14px/1 -apple-system, BlinkMacSystemFont, sans-serif;
          cursor: pointer; border: 1px solid transparent;
          transition: all 0.25s ease-out; text-decoration: none;
        }
        .public-btn-primary { background: var(--accent); color: #080B14; border-color: var(--accent); }
        [data-theme="light"] .public-btn-primary { color: #fff; }
        .public-btn-primary:hover { background: var(--accent-dark); border-color: var(--accent-dark); box-shadow: 0 0 30px var(--accent-glow); }
        .public-btn-outline { background: transparent; color: var(--foreground); border-color: var(--border); }
        .public-btn-outline:hover { border-color: var(--accent); color: var(--accent); }
        .public-theme-toggle {
          width: 36px; height: 36px; border-radius: 50%;
          background: transparent; border: 1px solid var(--border);
          color: var(--muted-foreground); cursor: pointer;
          display: grid; place-items: center;
          transition: all 0.25s ease-out;
          font-size: 16px; line-height: 1;
        }
        .public-theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
        .public-footer { padding: 60px 0 32px; border-top: 1px solid var(--border); }
        .public-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; max-width: 1200px; margin: 0 auto; padding: 0 24px; margin-bottom: 40px; }
        .public-footer-brand p { font-size: 14px; color: var(--muted-foreground); margin-top: 12px; max-width: 280px; line-height: 1.6; }
        .public-footer-col h4 { font: 600 14px/1 var(--font-display); margin-bottom: 16px; color: var(--foreground); }
        .public-footer-col a { display: block; font-size: 14px; color: var(--muted-foreground); margin-bottom: 10px; text-decoration: none; }
        .public-footer-col a:hover { color: var(--foreground); }
        .public-footer-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 24px; border-top: 1px solid var(--border);
          font-size: 13px; color: var(--muted-foreground);
          max-width: 1200px; margin: 0 auto; padding-left: 24px; padding-right: 24px;
        }
        @media (max-width: 640px) {
          .public-header-inner { height: 56px; }
          .public-nav { display: none; }
          .public-btn { padding: 8px 16px; font-size: 13px; }
          .public-btn-primary { padding: 8px 14px; }
          .public-footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="public-header">
        <div className="container public-header-inner">
          <Link href="/" className="public-logo">
            <span className="public-logo-icon"><span>F</span></span>
            Finly
          </Link>
          <nav className="public-nav">
            <Link href="/#recursos">Recursos</Link>
            <Link href="/#showcase">Produto</Link>
            <Link href="/#numeros">Números</Link>
          </nav>
          <div className="public-actions">
            <button
              type="button"
              className="public-theme-toggle"
              aria-label="Alternar tema"
              suppressHydrationWarning
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <Link href="/login" className="public-btn public-btn-outline">Entrar</Link>
            <Link href="/register" className="public-btn public-btn-primary">Começar grátis</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-[64px]">{children}</main>

      <footer className="public-footer">
        <div className="public-footer-grid">
          <div className="public-footer-brand">
            <Link href="/" className="public-logo">
              <span className="public-logo-icon"><span>F</span></span>
              Finly
            </Link>
            <p>Gerenciador financeiro pessoal simples e poderoso para quem quer cuidar do próprio dinheiro.</p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title} className="public-footer-col">
              <h4>{col.title}</h4>
              {col.links.map((link) => (
                <Link key={link.label} href={link.href}>{link.label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="public-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Finly. Todos os direitos reservados.</span>
          <span>Feito com cuidado no Brasil</span>
        </div>
      </footer>
    </div>
  )
}
