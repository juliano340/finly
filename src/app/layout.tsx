import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { Providers } from "@/components/providers"
import { version } from "../../package.json"
import "./globals.css"

const OG_IMAGE = `/og.png?v=${version}`

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Finly — Controle Financeiro",
  description:
    "Gerencie suas finanças pessoais de forma simples e inteligente.",
  openGraph: {
    title: "Finly — Controle Financeiro",
    description:
      "Gerencie suas finanças pessoais de forma simples e inteligente.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finly — Controle Financeiro",
    description:
      "Gerencie suas finanças pessoais de forma simples e inteligente.",
    images: [OG_IMAGE],
  },
}

const themeBootstrap = `(function(){try{var t=localStorage.getItem('cinema-theme');var theme=(t==='light'||t==='dark')?t:'light';document.documentElement.setAttribute('data-theme',theme);}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <Script id="theme-bootstrap" strategy="beforeInteractive">{themeBootstrap}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
