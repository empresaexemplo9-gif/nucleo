import Link from "next/link";
import { contactText, LEGAL } from "@/lib/legal";

export const metadata = { title: "Política de privacidade · Gestão & CRM" };

export default function PrivacidadePage() {
  return (
    <article>
      <h1>Política de privacidade</h1>
      <p className="text-sm text-muted">Atualizada em {LEGAL.updatedAt}</p>

      <p>
        Esta política explica como a plataforma Gestão &amp; CRM, desenvolvida e operada por {LEGAL.company}
        {LEGAL.document ? ` (${LEGAL.document})` : ""}, trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018, LGPD).
      </p>

      <h2>1. Papéis no tratamento</h2>
      <ul>
        <li>
          <b>Empresas clientes</b> usam a plataforma para gerenciar seus próprios clientes, contatos, negócios e atendimentos. Para esses dados, a empresa
          cliente é a <b>controladora</b> e decide o que coletar e por quanto tempo guardar.
        </li>
        <li>
          <b>{LEGAL.company}</b> atua como <b>operadora</b>: trata esses dados somente para prestar o serviço, conforme as instruções da empresa cliente.
        </li>
        <li>Para os dados de cadastro dos usuários da plataforma (nome, e-mail, senha), {LEGAL.company} é controladora.</li>
      </ul>

      <h2>2. Dados tratados</h2>
      <ul>
        <li><b>Usuários da plataforma:</b> nome, e-mail, senha (guardada apenas em formato cifrado), empresa, perfil de acesso e registros de uso.</li>
        <li><b>Contatos e clientes das empresas:</b> nome, telefone, WhatsApp, e-mail, empresa, histórico de negócios, atividades, notas e campos personalizados cadastrados pela empresa cliente.</li>
        <li>
          <b>Mensagens do WhatsApp:</b> quando a empresa conecta o seu número pela API oficial do WhatsApp Business (Meta), a plataforma recebe e guarda as
          mensagens trocadas com os clientes dessa empresa, o número de telefone, o nome de perfil e o status de entrega, para exibi-las na caixa de
          atendimento e executar as automações configuradas.
        </li>
        <li><b>Dados técnicos:</b> endereço IP, navegador e registros de acesso, para segurança e diagnóstico.</li>
      </ul>

      <h2>3. Finalidades e bases legais</h2>
      <ul>
        <li>Prestar o serviço contratado: CRM, atendimento, automações e relatórios (execução de contrato).</li>
        <li>Enviar e receber mensagens de WhatsApp em nome da empresa cliente, inclusive lembretes e follow-ups configurados por ela (execução de contrato e legítimo interesse da empresa cliente, que é responsável por obter o consentimento quando exigido).</li>
        <li>Responder com o assistente virtual (IA) quando a empresa ativa o chatbot com IA: o texto da conversa é processado para gerar a resposta.</li>
        <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais (legítimo interesse e obrigação legal).</li>
      </ul>
      <p>Não vendemos dados pessoais e não os usamos para publicidade.</p>

      <h2>4. Compartilhamento</h2>
      <p>Os dados são compartilhados apenas com fornecedores necessários para o funcionamento do serviço:</p>
      <ul>
        <li>Meta Platforms (WhatsApp Business Platform), para enviar e receber mensagens do número conectado;</li>
        <li>provedores de hospedagem e banco de dados em nuvem;</li>
        <li>Anthropic, quando o chatbot com IA está ativado, somente para gerar as respostas;</li>
        <li>autoridades, quando houver obrigação legal ou ordem judicial.</li>
      </ul>
      <p>Alguns desses fornecedores podem tratar dados fora do Brasil, com as salvaguardas previstas na LGPD.</p>

      <h2>5. Segurança e retenção</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas cifradas, tokens de integração cifrados, controle de acesso por perfil e separação dos dados de cada
        empresa. Os dados ficam guardados enquanto a empresa cliente mantiver a conta ativa ou pelo prazo exigido em lei, e são excluídos ou anonimizados
        quando deixam de ser necessários.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade, exclusão, informação sobre compartilhamento e revogação do
        consentimento. Se você é cliente de uma empresa que usa a plataforma, faça o pedido diretamente a essa empresa; nós a apoiaremos no atendimento. Veja
        também <Link href="/exclusao-de-dados">como pedir a exclusão dos seus dados</Link>.
      </p>
      <p>Para receber mensagens automáticas pelo WhatsApp, você pode responder <b>SAIR</b> a qualquer momento.</p>

      <h2>7. Contato</h2>
      <p>Dúvidas sobre esta política ou pedidos relacionados aos seus dados: {contactText()}.</p>
    </article>
  );
}
