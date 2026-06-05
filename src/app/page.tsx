export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Finly
      </h1>
      <p className="text-lg text-muted-foreground">
        Controle financeiro pessoal — SaaS
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Entrar
        </a>
        <a
          href="/register"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input px-6 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Criar conta
        </a>
      </div>
    </div>
  )
}
