import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { installTemplate } from "./modules";

/** Carga temporária: módulos de controle interno com registros fictícios para a conta de apresentação. */
const day = 86400000;
const iso = (offset: number) => new Date(Date.now() + offset * day).toISOString().slice(0, 10);

type Rec = { title: string; status: string; data: Record<string, unknown>; created: number; note?: string };

export async function seedModules(email: string) {
  const user = await db.user.findUnique({ where: { email }, include: { memberships: { include: { org: true } } } });
  if (!user) throw new Error("Usuário não encontrado");
  const m = user.memberships.find((x) => ((x.org.settings ?? {}) as Record<string, unknown>).presentationSeeded) ?? user.memberships.find((x) => x.role === "OWNER");
  if (!m) throw new Error("Empresa não encontrada");
  const org = m.org;
  const settings = (org.settings ?? {}) as Record<string, unknown>;
  if (settings.modulesSeeded) return { ok: true, skipped: true, org: org.name };
  await db.organization.update({ where: { id: org.id }, data: { settings: { ...settings, modulesSeeded: true } as Prisma.InputJsonObject } });

  const [companies, contacts, members] = await Promise.all([
    db.company.findMany({ where: { orgId: org.id }, select: { id: true, name: true } }),
    db.contact.findMany({ where: { orgId: org.id }, select: { id: true, name: true, companyId: true } }),
    db.membership.findMany({ where: { orgId: org.id }, select: { userId: true } }),
  ]);
  const co = (s: string) => companies.find((c) => c.name.toLowerCase().includes(s.toLowerCase()))?.id ?? companies[0]?.id ?? null;
  const ct = (s: string) => contacts.find((c) => c.name.toLowerCase().includes(s.toLowerCase()))?.id ?? contacts[0]?.id ?? null;
  const ctOf = (companyId: string | null) => contacts.find((c) => c.companyId === companyId)?.id ?? null;
  const users = members.map((x) => x.userId);
  const who = (i: number) => users[i % users.length] ?? user.id;

  const plan: Record<string, Rec[]> = {
    projetos: [
      { title: "Implantação DRAP Backoffice — Ateliê Varandas", status: "Em andamento", created: -40, data: { cliente: co("Varandas"), orcamento: 18500, inicio: iso(-35), entrega: iso(12), prioridade: "Alta", escopo: "Migração de orçamentos e propostas, configuração do diário de obra e treinamento da equipe de projetos." }, note: "Kickoff realizado; base de orçamentos importada (412 itens)." },
      { title: "Implantação DRAP Backoffice — Construtora Horizonte Alto", status: "Em revisão", created: -62, data: { cliente: co("Horizonte"), orcamento: 42000, inicio: iso(-58), entrega: iso(3), prioridade: "Urgente", escopo: "Financeiro por obra para 9 canteiros, portal do cliente e integração com o ERP contábil." } },
      { title: "Plataforma EAD — Instituto Saber Mais", status: "Em andamento", created: -25, data: { cliente: co("Saber"), orcamento: 26800, inicio: iso(-20), entrega: iso(25), prioridade: "Média", escopo: "Trilhas por nível, 2FA para professores, migração de 1.800 alunos e identidade visual white-label." } },
      { title: "DRAP Fazenda — conciliação OFX e NF-e", status: "Planejamento", created: -6, data: { cliente: co("Boa Vista"), orcamento: 15400, inicio: iso(4), entrega: iso(45), prioridade: "Alta", escopo: "Livro-razão por safra, acerto entre sócios e emissão de NF-e de grãos." } },
      { title: "DRAP Pecuária offline — Três Irmãos", status: "Pausado", created: -50, data: { cliente: co("Três Irmãos"), orcamento: 12900, inicio: iso(-45), entrega: iso(-5), prioridade: "Média", escopo: "PWA offline para 3 retiros, módulos Corte e Genética. Pausado aguardando dados do rebanho." } },
      { title: "Escola Vértice — trilhas corporativas", status: "Entregue", created: -95, data: { cliente: co("Vértice"), orcamento: 21000, inicio: iso(-90), entrega: iso(-20), prioridade: "Média", escopo: "Mentorias e cursos in-company com certificação." }, note: "Projeto aceito pelo cliente; NPS 9." },
    ],
    chamados: [
      { title: "Liberar acesso ao Figma para novo designer", status: "Novo", created: -1, data: { departamento: "TI", categoria: "Acesso", prioridade: "Média", prazo: iso(2), descricao: "Novo integrante do time de produto começa na segunda." } },
      { title: "Notebook da equipe de suporte sem bateria", status: "Em atendimento", created: -3, data: { departamento: "Operações", categoria: "Equipamento", prioridade: "Alta", prazo: iso(-1), descricao: "Bateria não segura carga; solicitar troca na garantia." } },
      { title: "Ajustar permissões do ambiente de homologação", status: "Aguardando solicitante", created: -5, data: { departamento: "TI", categoria: "Sistema", prioridade: "Baixa", prazo: iso(4), descricao: "Confirmar quais desenvolvedores precisam de acesso de escrita." } },
      { title: "Emitir certificado digital A1 para NF-e", status: "Em atendimento", created: -8, data: { departamento: "Financeiro", categoria: "Solicitação", prioridade: "Urgente", prazo: iso(-2), descricao: "Certificado vence nesta semana." } },
      { title: "Dúvida sobre política de férias", status: "Resolvido", created: -12, data: { departamento: "RH", categoria: "Dúvida", prioridade: "Baixa", prazo: iso(-9), descricao: "Respondido com o regulamento interno." } },
      { title: "Configurar domínio do portal white-label do cliente", status: "Novo", created: 0, data: { departamento: "Comercial", categoria: "Sistema", prioridade: "Alta", prazo: iso(3), descricao: "Cliente Horizonte Alto quer usar portal.horizontealto.com.br." } },
      { title: "Renovar licenças de software de design", status: "Resolvido", created: -20, data: { departamento: "Administrativo", categoria: "Solicitação", prioridade: "Média", prazo: iso(-15), descricao: "Renovadas por 12 meses." } },
    ],
    contratos: [
      { title: "Assinatura DRAP Backoffice — Horizonte Alto", status: "Ativo", created: -60, data: { empresa: co("Horizonte"), cliente: ct("Roberto"), valor: 10680, inicio: iso(-60), fim: iso(305), renovacao: true, reajuste: "IPCA", arquivo: "https://drap-softwerehouse.vercel.app/" } },
      { title: "Assinatura DRAP Backoffice — Ateliê Varandas", status: "Ativo", created: -40, data: { empresa: co("Varandas"), cliente: ct("Fernanda"), valor: 10680, inicio: iso(-40), fim: iso(325), renovacao: true, reajuste: "IPCA" } },
      { title: "Licença DRAP Professor — Instituto Saber Mais", status: "Em elaboração", created: -4, data: { empresa: co("Saber"), cliente: ct("Luciana"), valor: 7080, inicio: iso(10), fim: iso(375), renovacao: true, reajuste: "IGP-M" } },
      { title: "DRAP Fazenda — Agro Santa Helena", status: "Em renovação", created: -340, data: { empresa: co("Santa Helena"), cliente: ct("Cláudio"), valor: 9480, inicio: iso(-340), fim: iso(25), renovacao: true, reajuste: "IGP-M" }, note: "Cliente pediu proposta com módulo de NF-e incluso." },
      { title: "DRAP Pecuária — Três Irmãos", status: "Ativo", created: -50, data: { empresa: co("Três Irmãos"), valor: 8280, inicio: iso(-50), fim: iso(315), renovacao: false, reajuste: "Sem reajuste" } },
      { title: "Escola Vértice — trilhas 2025", status: "Encerrado", created: -400, data: { empresa: co("Vértice"), cliente: ct("Eduardo"), valor: 6600, inicio: iso(-400), fim: iso(-35), renovacao: false, reajuste: "IPCA" } },
    ],
    financeiro: [
      { title: "Mensalidade Backoffice — Horizonte Alto", status: "Pago / recebido", created: -15, data: { tipo: "Receita", categoria: "Vendas", centro_custo: "Comercial", valor: 890, vencimento: iso(-10), forma: "Boleto", fornecedor: co("Horizonte"), documento: "NFS-e 2026/0418" } },
      { title: "Mensalidade Backoffice — Ateliê Varandas", status: "Em aberto", created: -5, data: { tipo: "Receita", categoria: "Vendas", centro_custo: "Comercial", valor: 890, vencimento: iso(5), forma: "Pix", fornecedor: co("Varandas") } },
      { title: "Implantação Horizonte Alto — parcela 2/3", status: "Agendado", created: -10, data: { tipo: "Receita", categoria: "Serviços", centro_custo: "Operações", valor: 14000, vencimento: iso(8), forma: "Transferência", fornecedor: co("Horizonte"), documento: "NFS-e 2026/0421" } },
      { title: "Implantação Saber Mais — entrada", status: "Em aberto", created: -9, data: { tipo: "Receita", categoria: "Serviços", centro_custo: "Operações", valor: 8900, vencimento: iso(-3), forma: "Boleto", fornecedor: co("Saber") } },
      { title: "Mensalidade Pecuária — Três Irmãos", status: "Pago / recebido", created: -20, data: { tipo: "Receita", categoria: "Vendas", centro_custo: "Comercial", valor: 690, vencimento: iso(-18), forma: "Pix", fornecedor: co("Três Irmãos") } },
      { title: "Hospedagem e banco de dados (nuvem)", status: "Agendado", created: -7, data: { tipo: "Despesa", categoria: "Fornecedores", centro_custo: "Produção", valor: 1840, vencimento: iso(6), forma: "Cartão" } },
      { title: "Folha de pagamento — equipe de produto", status: "Em aberto", created: -2, data: { tipo: "Despesa", categoria: "Folha", centro_custo: "Produção", valor: 38500, vencimento: iso(17), forma: "Transferência" } },
      { title: "DAS — Simples Nacional", status: "Em aberto", created: -4, data: { tipo: "Despesa", categoria: "Impostos", centro_custo: "Administrativo", valor: 4120, vencimento: iso(7), forma: "Boleto" } },
      { title: "Campanha de mídia — feira do agronegócio", status: "Pago / recebido", created: -25, data: { tipo: "Despesa", categoria: "Marketing", centro_custo: "Comercial", valor: 6300, vencimento: iso(-21), forma: "Pix" } },
      { title: "Aluguel do escritório", status: "Em aberto", created: -6, data: { tipo: "Despesa", categoria: "Aluguel", centro_custo: "Administrativo", valor: 5200, vencimento: iso(-1), forma: "Boleto" } },
      { title: "Licença Professor — Escola Vértice (estorno)", status: "Cancelado", created: -30, data: { tipo: "Receita", categoria: "Vendas", centro_custo: "Comercial", valor: 590, vencimento: iso(-28), forma: "Cartão", fornecedor: co("Vértice") } },
    ],
  };

  const out: Record<string, number> = {};
  const existing = await db.customModule.findMany({ where: { orgId: org.id }, select: { templateKey: true } });
  for (const [tpl, recs] of Object.entries(plan)) {
    if (existing.some((e) => e.templateKey === tpl)) continue;
    const mod = await db.$transaction((tx) => installTemplate(tx, org.id, tpl), { timeout: 30000, maxWait: 10000 });
    if (tpl === "projetos") await db.customModule.update({ where: { id: mod.id }, data: { name: "Projetos e implantações", singular: "Projeto" } });
    const statuses = await db.moduleStatus.findMany({ where: { moduleId: mod.id } });
    const fields = await db.moduleField.findMany({ where: { moduleId: mod.id } });
    let n = 0;
    for (const [i, r] of recs.entries()) {
      const st = statuses.find((s) => s.name === r.status) ?? statuses[0]!;
      const data = Object.fromEntries(Object.entries(r.data).filter(([, v]) => v != null));
      const due = mod.dueFieldKey ? (data[mod.dueFieldKey] as string | undefined) : undefined;
      const amount = mod.amountFieldKey ? (data[mod.amountFieldKey] as number | undefined) : undefined;
      const firstOf = (type: string) => {
        const f = fields.filter((x) => x.type === type).sort((a, b) => a.position - b.position)[0];
        return f ? ((data[f.key] as string | undefined) ?? null) : null;
      };
      const companyId = firstOf("COMPANY");
      const contactId = firstOf("CONTACT") ?? ctOf(companyId);
      const created = new Date(Date.now() + r.created * day);
      const assigneeId = who(i);
      n += 1;
      const rec = await db.moduleRecord.create({
        data: {
          orgId: org.id,
          moduleId: mod.id,
          number: n,
          title: r.title,
          statusId: st.id,
          assigneeId,
          createdById: user.id,
          contactId,
          companyId,
          data: data as Prisma.InputJsonObject,
          dueAt: due ? new Date(`${due}T12:00:00`) : null,
          amount: amount ?? null,
          position: i,
          createdAt: created,
          closedAt: st.isFinal ? new Date(Math.min(Date.now(), created.getTime() + 5 * day)) : null,
        },
      });
      const first = statuses.sort((a, b) => a.position - b.position)[0]!;
      await db.timelineEvent.create({ data: { orgId: org.id, recordId: rec.id, userId: user.id, type: "RECORD_CREATED", data: { name: mod.singular }, createdAt: created } });
      if (st.id !== first.id)
        await db.timelineEvent.create({ data: { orgId: org.id, recordId: rec.id, userId: assigneeId, type: "RECORD_STATUS", data: { from: first.name, to: st.name }, createdAt: new Date(Math.min(Date.now() - 3600000, created.getTime() + 2 * day)) } });
      if (r.note) await db.note.create({ data: { orgId: org.id, recordId: rec.id, authorId: assigneeId, content: r.note, createdAt: new Date(Math.min(Date.now() - 1800000, created.getTime() + 3 * day)) } });
    }
    await db.customModule.update({ where: { id: mod.id }, data: { sequence: n } });
    out[tpl] = n;
  }
  return { ok: true, org: org.name, records: out };
}
