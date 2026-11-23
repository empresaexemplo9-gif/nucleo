import Link from "next/link";
import { contactText, LEGAL } from "@/lib/legal";

export const metadata = { title: "Exclusão de dados · Gestão & CRM" };

export default function ExclusaoPage() {
  return (
    <article>
      <h1>Exclusão de dados</h1>
      <p className="text-sm text-muted">Atualizado em {LEGAL.updatedAt}</p>

      <p>Você pode pedir a exclusão dos seus dados pessoais a qualquer momento. O caminho depende de como você se relaciona com a plataforma:</p>

      <h2>Se você conversou pelo WhatsApp com uma empresa que usa a plataforma</h2>
      <ul>
        <li>Para parar de receber mensagens automáticas, responda <b>SAIR</b> na conversa.</li>
        <li>
          Para excluir suas mensagens e seus dados de contato, peça diretamente à empresa com quem você conversou: ela é a responsável pelos seus dados e pode
          excluí-los na plataforma.
        </li>
        <li>Se não conseguir falar com a empresa, escreva para nós {contactText()} informando o número de telefone e o nome da empresa. Encaminhamos o pedido e acompanhamos a exclusão.</li>
      </ul>

      <h2>Se você é usuário da plataforma</h2>
      <ul>
        <li>Peça ao administrador da sua empresa para remover seu acesso; ou</li>
        <li>escreva para nós {contactText()} a partir do e-mail cadastrado, pedindo a exclusão da sua conta.</li>
      </ul>

      <h2>Prazo e o que é excluído</h2>
      <p>
        Confirmamos o pedido e concluímos a exclusão em até 15 dias. Removemos nome, telefone, e-mail, mensagens e demais dados pessoais vinculados, exceto o
        que precisarmos manter por obrigação legal, pelo prazo exigido em lei.
      </p>
      <p>
        Mais detalhes na <Link href="/privacidade">política de privacidade</Link>. Responsável: {LEGAL.company}.
      </p>
    </article>
  );
}
