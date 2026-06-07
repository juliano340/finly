"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const plans = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    description: "Para começar a controlar suas finanças",
    features: [
      "Até 50 transações/mês",
      "Até 10 categorias",
      "Até 3 orçamentos",
      "Dashboard básico",
      "Importação CSV",
    ],
    cta: "Começar grátis",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 29,90",
    period: "/mês",
    description: "Para quem quer controle total",
    features: [
      "Transações ilimitadas",
      "Categorias ilimitadas",
      "Orçamentos ilimitados",
      "Dashboard completo com gráficos",
      "Importação CSV/OFX",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    popular: true,
  },
]

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
        <p className="mt-2 text-muted-foreground">
          Escolha o plano ideal para você
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative border-0 shadow-sm ${
              plan.popular ? "ring-2 ring-primary" : ""
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Mais popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
