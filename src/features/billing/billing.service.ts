export interface Plan {
  id: string
  name: string
  price: number
  features: string[]
  limits: {
    transactions: number
    categories: number
    budgets: number
  }
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "Gratuito",
    price: 0,
    features: [
      "Até 50 transações/mês",
      "Até 10 categorias",
      "Até 3 orçamentos",
      "Dashboard básico",
      "Importação CSV",
    ],
    limits: {
      transactions: 50,
      categories: 10,
      budgets: 3,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29.9,
    features: [
      "Transações ilimitadas",
      "Categorias ilimitadas",
      "Orçamentos ilimitados",
      "Dashboard completo com gráficos",
      "Importação CSV/OFX",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    limits: {
      transactions: Infinity,
      categories: Infinity,
      budgets: Infinity,
    },
  },
}

export interface UserPlan {
  planId: string
  status: "active" | "cancelled" | "trial"
  currentPeriodEnd: Date | null
}

export async function getUserPlan(userId: string): Promise<UserPlan> { // eslint-disable-line @typescript-eslint/no-unused-vars
  // For now, return free plan for all users
  // In Phase 8 (Stripe), this will check the database
  return {
    planId: "free",
    status: "active",
    currentPeriodEnd: null,
  }
}

export function canPerformAction(
  userPlan: UserPlan,
  action: "transactions" | "categories" | "budgets",
  currentCount: number
): boolean {
  const plan = PLANS[userPlan.planId] ?? PLANS.free
  return currentCount < plan.limits[action]
}
