import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finly — Controle Financeiro",
    short_name: "Finly",
    description: "Gerencie suas finanças pessoais de forma simples e inteligente.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#080B14",
    theme_color: "#080B14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
