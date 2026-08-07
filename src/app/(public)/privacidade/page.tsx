import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8 px-4">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 05 de agosto de 2026</p>
      </div>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Dados Coletados</h2>
          <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nome e email (cadastro)</li>
            <li>Dados financeiros que você registra (transações, contas, cartões)</li>
            <li>Informações de uso do serviço (logs de acesso)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Uso dos Dados</h2>
          <p>Seus dados são utilizados exclusivamente para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide e manter o serviço</li>
            <li>Autenticar e proteger sua conta</li>
            <li>Gerar relatórios e estatísticas financeiras</li>
            <li>Enviar notificações relevantes (vencimentos, lembretes)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Compartilhamento</h2>
          <p>Não compartilhamos seus dados pessoais com terceiros. Seus dados financeiros são estritamente privados e não são acessíveis por outros usuários ou empresas.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Segurança</h2>
          <p>Utilizamos práticas padrão de segurança da indústria para proteger seus dados, incluindo criptografia em trânsito (HTTPS) e acesso restrito ao banco de dados.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Armazenamento</h2>
          <p>Seus dados são armazenados em servidores seguros e mantidos enquanto sua conta estiver ativa. Ao cancelar sua conta, seus dados são permanentemente excluídos.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Seus Direitos</h2>
          <p>Você tem direito a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acessar todos os seus dados</li>
            <li>Exportar seus dados em formato compatível</li>
            <li>Solicitar a exclusão permanente de sua conta e dados</li>
            <li>Corrigir dados incorretos</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Cookies</h2>
          <p>Utilizamos cookies essenciais para autenticação e funcionamento do serviço. Não utilizamos cookies de rastreamento ou publicitários.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Alterações nesta Política</h2>
          <p>Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas por email ou através do serviço.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Contato</h2>
          <p>Em caso de dúvidas sobre esta política de privacidade, entre em contato pelo email suporte@finly.com.br.</p>
        </section>
      </div>
    </div>
  )
}
