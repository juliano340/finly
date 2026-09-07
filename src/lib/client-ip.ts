/**
 * Extrai o IP do cliente priorizando os cabeçalhos que a plataforma
 * (Vercel) atesta. `x-forwarded-for` só é lido no ÚLTIMO hop — o mais
 * próximo do servidor — porque o primeiro elemento é controlado pelo
 * cliente e pode ser forjado para contornar rate limits.
 */
export function clientAddress(request: Request): string | null {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    null
  )
}
