import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TermosDeUsoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8 px-4">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 05 de agosto de 2026</p>
      </div>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar o Finly, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Descrição do Serviço</h2>
          <p>O Finly é um gerenciador financeiro pessoal que permite controlar receitas, despesas, contas bancárias, cartões de crédito, lançamentos fixos e relatórios financeiros.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Conta do Usuário</h2>
          <p>Para utilizar o Finly, é necessário criar uma conta com email e senha. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Uso Aceitável</h2>
          <p>Ao utilizar o Finly, você concorda em:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Não tentar acessar contas de outros usuários</li>
            <li>Não utilizar o serviço para fins ilegais ou não autorizados</li>
            <li>Não interferir no funcionamento do serviço</li>
            <li>Não enviar vírus ou código malicioso</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Propriedade Intelectual</h2>
          <p>Todo o conteúdo, design, código-fonte e funcionalidades do Finly são protegidos por direitos autorais e propriedade intelectual.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Isenção de Responsabilidade</h2>
          <p>O Finly é uma ferramenta de organização financeira pessoal. Não oferecemos aconselhamento financeiro, de investimento ou tributário. Todas as decisões financeiras são de sua responsabilidade.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Disponibilidade</h2>
          <p>Embora nos esforcemos para manter o serviço disponível, não garantimos disponibilidade interrompida. Podemos realizar manutenções programadas ou não programadas sem aviso prévio.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Alterações nos Termos</h2>
          <p>Reservamo-nos o direito de alterar estes termos a qualquer momento. Alterações significativas serão comunicadas por email ou através do serviço.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Cancelamento</h2>
          <p>Você pode cancelar sua conta a qualquer momento nas configurações. O cancelamento resultará na exclusão permanente de seus dados.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Contato</h2>
          <p>Em caso de dúvidas sobre estes termos, entre em contato pelo email suporte@finly.com.br.</p>
        </section>
      </div>
    </div>
  )
}
