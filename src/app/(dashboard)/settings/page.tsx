"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { Download, Loader2, LogOut, Moon, Save, Sun, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/ui/stepper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MeResponse {
  id: string
  name: string | null
  email: string
  image: string | null
  plan: string
  createdAt: string
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace")
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmResetFixedExpenses, setConfirmResetFixedExpenses] = useState(false)
  const [resettingFixedExpenses, setResettingFixedExpenses] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [action, setAction] = useState<"choose" | "export" | "import" | "reset">("choose")
  const [step, setStep] = useState(0)
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (!active || !data) return
        setMe(data)
        setName(data.name ?? "")
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      toast.error("O nome não pode ficar em branco.")
      return
    }
    setSaving(true)
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      const updated: MeResponse = await res.json()
      setMe(updated)
      await update({ name: updated.name })
      toast.success("Perfil atualizado.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível atualizar o perfil.")
    }
  }

  const initials = (me?.name ?? session?.user?.name ?? me?.email ?? session?.user?.email ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U"

  function handleExport() {
    const a = document.createElement("a")
    a.href = "/api/backup/export"
    a.click()
    setStep(1)
  }

  async function handleRestore() {
    if (!restoreFile) {
      toast.error("Selecione um arquivo de backup.")
      return
    }
    setConfirmRestore(false)
    setRestoring(true)
    try {
      const text = await restoreFile.text()
      const json = JSON.parse(text)
      const res = await fetch(`/api/backup/restore?mode=${importMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      })
      if (res.ok) {
        const result = await res.json()
        const c = result.imported as Record<string, number>
        const total = Object.values(c).reduce((a, b) => a + b, 0)
        toast.success(`${total} registros importados com sucesso!`)
        setImportResult(c)
        setRestoreFile(null)
        setStep(3)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Erro ao importar backup")
      }
    } catch {
      toast.error("Arquivo inválido ou corrompido.")
    } finally {
      setRestoring(false)
    }
  }

  async function handleResetFixedExpenses() {
    setResettingFixedExpenses(true)
    try {
      const res = await fetch("/api/fixed-costs/reset-expenses", { method: "POST" })
      if (res.ok) {
        const result = await res.json() as { fixedCostsDeleted: number; occurrencesDeleted: number }
        toast.success(
          `${result.fixedCostsDeleted} despesa${result.fixedCostsDeleted !== 1 ? "s" : ""} fixa${result.fixedCostsDeleted !== 1 ? "s" : ""} e ${result.occurrencesDeleted} ocorrência${result.occurrencesDeleted !== 1 ? "s" : ""} apagada${result.occurrencesDeleted !== 1 ? "s" : ""}.`
        )
        setConfirmResetFixedExpenses(false)
        setStep(1)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Não foi possível zerar despesas fixas.")
      }
    } finally {
      setResettingFixedExpenses(false)
    }
  }

  function resetWizard() {
    setAction("choose")
    setStep(0)
    setImportResult(null)
    setRestoreFile(null)
    setImportMode("replace")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Preferências gerais da sua conta Finly.</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="session">Sessão</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="w-full space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Meu perfil</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                      {initials}
                    </div>
                    <div>
                      <p className="text-base font-medium">{me?.name ?? "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{me?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input value={me?.email ?? ""} disabled />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado nesta versão.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plano</Label>
                    <Input value={me?.plan ?? "FREE"} disabled />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar alterações
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="w-full space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Escolha entre o tema claro ou escuro.</p>
              <div className="flex gap-2">
                <Button
                  variant={resolvedTheme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-4 w-4" /> Claro
                </Button>
                <Button
                  variant={resolvedTheme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-4 w-4" /> Escuro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="w-full space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Você está logado como <span className="font-medium">{session?.user?.email}</span>.
              </p>
              <SignOutButton />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="w-full space-y-4">
          {action === "choose" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <button type="button" onClick={() => { setAction("export"); setStep(0) }} className="flex flex-col items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-8 text-center transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md group/card">
                <Download className="h-8 w-8 text-primary/70 transition-colors group-hover/card:text-primary" />
                <div>
                  <p className="text-base font-semibold text-foreground">Exportar dados</p>
                  <p className="mt-1 text-xs text-muted-foreground">Baixar backup completo em JSON</p>
                </div>
              </button>
              <button type="button" onClick={() => { setAction("import"); setStep(0) }} className="flex flex-col items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-8 text-center transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md group/card">
                <Upload className="h-8 w-8 text-primary/70 transition-colors group-hover/card:text-primary" />
                <div>
                  <p className="text-base font-semibold text-foreground">Importar dados</p>
                  <p className="mt-1 text-xs text-muted-foreground">Restaurar backup salvo anteriormente</p>
                </div>
              </button>
              <button type="button" onClick={() => { setAction("reset"); setStep(0) }} className="flex flex-col items-center gap-3 rounded-xl border border-destructive/15 bg-destructive/5 p-8 text-center transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:shadow-md group/card">
                <Trash2 className="h-8 w-8 text-destructive/70 transition-colors group-hover/card:text-destructive" />
                <div>
                  <p className="text-base font-semibold text-foreground">Zerar despesas fixas</p>
                  <p className="mt-1 text-xs text-muted-foreground">Apagar lançamentos fixos de todos os meses</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-xl space-y-6">
              {action === "import" && <Stepper steps={[{ title: "Arquivo" }, { title: "Modo" }, { title: "Confirmar" }, { title: "Resultado" }]} currentStep={step} />}
              {action === "export" && <Stepper steps={[{ title: "Baixar" }, { title: "Pronto" }]} currentStep={step} />}
              {action === "reset" && <Stepper steps={[{ title: "Confirmar" }, { title: "Pronto" }]} currentStep={step} />}

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  {action === "export" && step === 0 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Baixe todos os seus dados financeiros em um arquivo JSON. Útil para backup ou migração entre contas.</p>
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={resetWizard}>Voltar</Button>
                        <Button onClick={() => { handleExport(); setStep(1) }}>
                          <Download className="mr-2 h-4 w-4" /> Baixar backup
                        </Button>
                      </div>
                    </div>
                  )}

                  {action === "export" && step === 1 && (
                    <div className="space-y-4 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Download className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Backup baixado com sucesso!</p>
                      <Button variant="outline" onClick={resetWizard}>Voltar ao início</Button>
                    </div>
                  )}

                  {action === "import" && step === 0 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Selecione o arquivo <strong>.json</strong> do backup que você exportou anteriormente.</p>
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center transition-colors hover:border-primary hover:bg-accent/50">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Clique para selecionar o arquivo</p>
                          <p className="text-xs text-muted-foreground/60">.json — backup exportado do Finly</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)} className="hidden" />
                      </label>
                      {restoreFile && (
                        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                          <span className="truncate font-medium">{restoreFile.name}</span>
                          <span className="text-xs text-muted-foreground">{(restoreFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={resetWizard}>Voltar</Button>
                        <Button onClick={() => setStep(1)} disabled={!restoreFile}>Próximo</Button>
                      </div>
                    </div>
                  )}

                  {action === "import" && step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Escolha como os dados do backup serão aplicados:</p>
                      <div className="grid gap-3">
                        <button type="button" onClick={() => setImportMode("replace")} className={`flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-colors ${importMode === "replace" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${importMode === "replace" ? "border-primary" : "border-muted-foreground/40"}`}>
                            {importMode === "replace" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                          </span>
                          <div>
                            <p className="text-sm font-medium">Substituir tudo</p>
                            <p className="mt-1 text-xs text-muted-foreground">Apaga todos os dados atuais e importa o backup do zero. Ideal para restaurar um ponto anterior.</p>
                          </div>
                        </button>
                        <button type="button" onClick={() => setImportMode("merge")} className={`flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-colors ${importMode === "merge" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${importMode === "merge" ? "border-primary" : "border-muted-foreground/40"}`}>
                            {importMode === "merge" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                          </span>
                          <div>
                            <p className="text-sm font-medium">Mesclar</p>
                            <p className="mt-1 text-xs text-muted-foreground">Mantém os dados atuais e adiciona apenas o que ainda não existe (identificado por nome). Evita duplicatas.</p>
                          </div>
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
                        <Button onClick={() => setStep(2)}>Próximo</Button>
                      </div>
                    </div>
                  )}

                  {action === "import" && step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Resumo da importação</p>
                      <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Arquivo</span>
                          <span className="font-medium">{restoreFile?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Modo</span>
                          <span className="font-medium">{importMode === "replace" ? "Substituir tudo" : "Mesclar"}</span>
                        </div>
                      </div>
                      {importMode === "replace" && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                          ⚠️ Todos os dados atuais serão apagados. Esta ação não pode ser desfeita.
                        </div>
                      )}
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                        <Button onClick={() => {
                          if (importMode === "replace") {
                            setConfirmRestore(true)
                            return
                          }

                          handleRestore()
                        }} disabled={restoring}>
                          {restoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          {restoring ? "Importando..." : "Importar"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {action === "import" && step === 3 && importResult && (
                    <div className="space-y-4 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Importação concluída!</p>
                      <div className="space-y-1 rounded-lg bg-muted p-4 text-left text-sm">
                        {Object.entries(importResult).map(([key, count]) => (
                          <div key={key} className="flex justify-between gap-4">
                            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className="tabular-nums font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" onClick={resetWizard}>Voltar ao início</Button>
                    </div>
                  )}

                  {action === "reset" && step === 0 && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                        🗑️ Todos os lançamentos fixos de despesas e suas ocorrências em todos os meses serão apagados. Receitas fixas e movimentos bancários já gerados permanecem intactos. Esta ação não pode ser desfeita.
                      </div>
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={resetWizard}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => setConfirmResetFixedExpenses(true)} disabled={resettingFixedExpenses}>
                          {resettingFixedExpenses ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {resettingFixedExpenses ? "Zerando..." : "Zerar despesas fixas"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {action === "reset" && step === 1 && (
                    <div className="space-y-4 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Trash2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Despesas fixas zeradas com sucesso!</p>
                      <Button variant="outline" onClick={resetWizard}>Voltar ao início</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Substituir todos os dados?"
        description="Todos os dados atuais serão apagados e substituídos pelo backup. Esta ação não pode ser desfeita."
        confirmText="Sim, substituir"
        onConfirm={handleRestore}
      />
      <ConfirmDialog
        open={confirmResetFixedExpenses}
        onOpenChange={setConfirmResetFixedExpenses}
        title="Zerar despesas fixas?"
        description="Todos os lançamentos fixos de despesas e suas ocorrências serão apagados de todos os meses. Movimentos bancários já gerados permanecerão no extrato. Esta ação não pode ser desfeita."
        confirmText="Sim, zerar"
        loading={resettingFixedExpenses}
        onConfirm={handleResetFixedExpenses}
      />
    </div>
  )
}

function SignOutButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const { signOut } = await import("next-auth/react")
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <LogOut className="mr-2 h-4 w-4" /> Sair da conta
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sair da conta"
        description="Tem certeza que deseja sair da sua conta?"
        confirmText="Sim, sair"
        loading={loading}
        onConfirm={handleSignOut}
      />
    </>
  )
}
