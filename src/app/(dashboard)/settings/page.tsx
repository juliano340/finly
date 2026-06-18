"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { Loader2, LogOut, Moon, Save, Sun } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Preferências gerais da sua conta Finly.</p>
      </div>

      <Tabs defaultValue="account" orientation="vertical" className="items-start">
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="session">Sessão</TabsTrigger>
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
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{me?.name ?? "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{me?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input value={me?.email ?? ""} disabled />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado nesta versão.</p>
                  </div>
                  <div className="space-y-1">
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
      </Tabs>
    </div>
  )
}

function SignOutButton() {
  return (
    <Button
      variant="destructive"
      onClick={async () => {
        const { signOut } = await import("next-auth/react")
        await signOut({ redirect: false })
        window.location.href = "/login"
      }}
    >
      <LogOut className="mr-2 h-4 w-4" /> Sair da conta
    </Button>
  )
}
