import Link from "next/link";
import { contactText, LEGAL } from "@/lib/legal";

export const metadata = { title: "Termos de uso · Gestão & CRM" };

export default function TermosPage() {
  return (
    <article>
      <h1>Termos de uso</h1>
      <p className="text-sm text-muted">Atualizados em {LEGAL.updatedAt}</p>

      <p>
        Estes termos regem o uso da plataforma Gestão &amp; CRM, fornecida por {LEGAL.company}
        {LEGAL.document ? ` (${LEGAL.document})` : ""}. Ao criar uma conta ou usar a plataforma, você concorda com eles e com a{" "}
        <Link href="/privacidade">política de privacidade</Link>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        A plataforma oferece CRM, controle interno, módulos por segmento, automações e atendimento por WhatsApp. Funcionalidades, módulos e identidade visual
        podem variar conforme o plano contratado por cada empresa.
      </p>

      <h2>2. Contas e acessos</h2>
      <ul>
        <li>Cada usuário é responsável por manter sua senha em sigilo e pelas ações feitas com seu acesso.</li>
        <li>A empresa cliente define quem tem acesso e com qual perfil, e é responsável pelos acessos que conceder ou aprovar.</li>
        <li>Podemos suspender acessos usados de forma fraudulenta, abusiva ou contrária a estes termos.</li>
      </ul>

      <h2>3. Dados e responsabilidades da empresa cliente</h2>
      <ul>
        <li>A empresa cliente é dona dos dados que cadastra e é a controladora dos dados pessoais dos seus clientes e contatos.</li>
        <li>Cabe a ela ter base legal para tratar esses dados e, quando exigido, obter o consentimento para enviar mensagens.</li>
        <li>Não é permitido usar a plataforma para spam, conteúdo ilegal ou para violar direitos de terceiros.</li>
      </ul>

      <h2>4. WhatsApp</h2>
      <p>
        A integração usa a API oficial do WhatsApp Business (Meta). Ao conectar um número, a empresa cliente concorda também com as políticas do WhatsApp
        Business e do WhatsApp Business Messaging, inclusive as regras sobre modelos de mensagem, janela de 24 horas, consentimento e cobrança por conversa
        aplicada pela Meta. O cliente final pode responder <b>SAIR</b> para deixar de receber mensagens automáticas.
      </p>

      <h2>5. Disponibilidade</h2>
      <p>
        Trabalhamos para manter a plataforma disponível e segura, mas podem ocorrer interrupções por manutenção, falhas de terceiros (hospedagem, redes,
        Meta) ou eventos fora do nosso controle.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida por lei, não respondemos por lucros cessantes ou danos indiretos decorrentes do uso da plataforma, nem por conteúdo
        cadastrado ou mensagens enviadas pelas empresas clientes.
      </p>

      <h2>7. Encerramento</h2>
      <p>
        A empresa cliente pode encerrar o uso a qualquer momento. Após o encerramento, os dados podem ser exportados no prazo combinado e depois são excluídos,
        salvo obrigação legal de guarda.
      </p>

      <h2>8. Alterações e foro</h2>
      <p>
        Estes termos podem ser atualizados; a versão vigente fica sempre nesta página. Fica eleito o foro do domicílio do contratante para dirimir
        controvérsias, conforme a legislação brasileira.
      </p>

      <h2>9. Contato</h2>
      <p>Dúvidas sobre estes termos: {contactText()}.</p>
    </article>
  );
}
