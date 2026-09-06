"use client"

import { useEffect, useRef, useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { Download, Check, Eye, EyeOff, KeyRound, Loader2, LogOut, Moon, Pencil, Save, Sun, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Stepper } from "@/components/ui/stepper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPasswordStrength, PASSWORD_STRENGTH_COLORS, PASSWORD_STRENGTH_LABELS } from "@/lib/password-strength"

interface MeResponse {
  id: string
  name: string | null
  email: string
  image: string | null
  plan: string
  createdAt: string
  hasPassword: boolean
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const profileDirty = name.trim() !== "" && name.trim() !== (me?.name ?? "")

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || !profileDirty) return
    setSaving(true)
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const updated: MeResponse = await res.json()
        setMe(updated)
        await update({ name: updated.name })
        setEditingProfile(false)
        toast.success("Perfil atualizado.")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Não foi possível atualizar o perfil.")
      }
    } finally {
      setSaving(false)
    }
  }

  function startEditingProfile() {
    setName(me?.name ?? "")
    setEditingProfile(true)
  }

  function cancelEditingProfile() {
    setName(me?.name ?? "")
    setEditingProfile(false)
  }

  const isInitialPassword = me?.hasPassword === false
  const newPasswordRules = {
    minLength: newPassword.length >= 8,
    matches: confirmPassword.length > 0 && newPassword === confirmPassword,
  }
  const passwordStrength = getPasswordStrength(newPassword)

  function resetPasswordFields() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const refreshMe = async () => {
    const res = await fetch("/api/me")
    if (res.ok) setMe(await res.json())
  }

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação não coincide com a nova senha.")
      return
    }
    if (!isInitialPassword && !currentPassword) {
      toast.error("Informe sua senha atual.")
      return
    }
    setChangingPassword(true)
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isInitialPassword ? { newPassword } : { currentPassword, newPassword }),
    })
    if (!res.ok) {
      setChangingPassword(false)
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível definir a senha.")
      return
    }

    if (isInitialPassword) {
      setChangingPassword(false)
      setPasswordOpen(false)
      await refreshMe()
      toast.success("Senha definida. Agora você também pode entrar com e-mail e senha.")
      return
    }

    const email = me?.email ?? session?.user?.email
    if (email) {
      const relogin = await signIn("credentials", { email, password: newPassword, redirect: false })
      if (relogin?.error) {
        await signOut({ callbackUrl: "/login" })
        return
      }
    }

    setChangingPassword(false)
    setPasswordOpen(false)
    toast.success("Senha alterada com sucesso.")
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
    <div className="w-full space-y-6">
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

        <TabsContent value="account" className="w-full">
          <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full border-0 shadow-sm">
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
                    <Avatar className="h-16 w-16 shrink-0">
                      {me?.image && <AvatarImage src={me.image} alt={me?.name ?? me?.email ?? "Usuário"} />}
                      <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {editingProfile ? (
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={80}
                          autoComplete="name"
                          autoFocus
                          required
                        />
                      ) : (
                        <p className="truncate text-base font-medium">{me?.name ?? "Sem nome"}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
                      <p className="text-xs text-muted-foreground">Plano {me?.plan ?? "FREE"}</p>
                    </div>
                  </div>
                  {editingProfile ? (
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" disabled={saving} onClick={cancelEditingProfile}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving || !profileDirty}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar alterações
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={startEditingProfile}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="h-full border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{isInitialPassword ? "Definir senha" : "Alterar senha"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isInitialPassword
                      ? "Crie uma senha para também acessar com e-mail e senha."
                      : "Use 8+ caracteres com letras e números."}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setPasswordOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" /> {isInitialPassword ? "Definir senha" : "Alterar senha"}
                </Button>
              </div>
              <Separator />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-destructive">Excluir conta</p>
                  <p className="text-sm text-muted-foreground">Apaga permanentemente seu perfil e todos os dados financeiros.</p>
                </div>
                <DeleteAccountButton hasPassword={me?.hasPassword !== false} />
              </div>
            </CardContent>
          </Card>
          </div>

          <Dialog open={passwordOpen} onOpenChange={(open) => {
            setPasswordOpen(open)
            if (!open) resetPasswordFields()
          }}>
            <DialogContent showCloseButton={!changingPassword}>
              <DialogHeader>
                <DialogTitle>{isInitialPassword ? "Definir senha" : "Alterar senha"}</DialogTitle>
                <DialogDescription>Ao alterar a senha, as outras sessões ativas são encerradas.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {!isInitialPassword && (
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Senha atual</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="pr-10"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength ? PASSWORD_STRENGTH_COLORS[passwordStrength] : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newPassword.length === 0
                      ? "Use 8+ caracteres com letras e números"
                      : PASSWORD_STRENGTH_LABELS[passwordStrength]}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <ul className="space-y-1">
                  <PasswordRule ok={newPasswordRules.minLength}>Mínimo de 8 caracteres</PasswordRule>
                  <PasswordRule ok={newPasswordRules.matches}>Confirmação igual à nova senha</PasswordRule>
                </ul>
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={changingPassword} onClick={() => setPasswordOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={changingPassword || (!isInitialPassword && !currentPassword) || !newPasswordRules.minLength || !newPasswordRules.matches}>
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      isInitialPassword ? "Definir senha" : "Salvar nova senha"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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

function PasswordRule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}>
      <Check className="h-3.5 w-3.5" /> {children}
    </li>
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

function DeleteAccountButton({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const response = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hasPassword ? { password } : {}),
    })
    setLoading(false)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast.error(data.error ?? "Não foi possível excluir a conta.")
      return
    }

    const { signOut } = await import("next-auth/react")
    await signOut({ redirect: false })
    window.location.href = "/login?accountDeleted=1"
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) setPassword("")
    }}>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" /> Excluir conta
      </Button>
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Excluir conta permanentemente?</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.{hasPassword ? " Digite sua senha para confirmar." : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="delete-account-password">Senha atual</Label>
              <Input
                id="delete-account-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={loading || (hasPassword && !password)}>
              {loading ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
