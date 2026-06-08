import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Preferências gerais da sua conta Finly.</p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Em breve</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configurações de perfil, preferências e regras avançadas serão adicionadas aqui.
        </CardContent>
      </Card>
    </div>
  )
}
