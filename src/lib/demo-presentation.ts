import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { ActivityType, Prisma } from "@prisma/client";
import { db } from "./db";

/* ------------------------------------------------------------------ */
/* Documentos fictícios com dígitos verificadores válidos              */
/* ------------------------------------------------------------------ */

function cpf(base: string) {
  const d = base.split("").map(Number);
  for (const len of [9, 10]) {
    const sum = d.slice(0, len).reduce((s, n, i) => s + n * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    d.push(r === 10 ? 0 : r);
  }
  const s = d.join("");
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

function cnpj(base: string) {
  const d = base.split("").map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  for (const w of [w1, w2]) {
    const sum = w.reduce((s, x, i) => s + x * d[i]!, 0);
    const r = sum % 11;
    d.push(r < 2 ? 0 : 11 - r);
  }
  const s = d.join("");
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

const day = 86400000;
const ago = (n: number, h = 10) => {
  const d = new Date(Date.now() - n * day);
  d.setHours(h, (n * 7) % 60, 0, 0);
  return d;
};

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

const PRODUCTS = [
  { code: "BACKOFFICE", sku: "PLT-01", name: "DRAP Backoffice", price: 890, unit: "mês", description: "Arquitetura & Construção — backoffice completo do escritório: orçamentos com BDI, propostas, diário de obra, financeiro por obra, portal do cliente e Prancheta (DWG, IFC e PDF no navegador)." },
  { code: "PROFESSOR", sku: "PLT-02", name: "DRAP Professor", price: 590, unit: "mês", description: "Educação & Capacitação — plataforma EAD/LMS white-label para mentorias, cursos e trilhas por nível e módulo, perfis de acesso, 2FA e conformidade com a LGPD." },
  { code: "FAZENDA", sku: "PLT-03", name: "DRAP Fazenda", price: 790, unit: "mês", description: "Agronegócio — gestão financeira e agrícola integrada ao Google Planilhas: livro-razão por safra, acerto entre sócios, conciliação OFX, NF-e de grãos e assinatura ICP-Brasil." },
  { code: "PECUARIA", sku: "PLT-04", name: "DRAP Pecuária", price: 690, unit: "mês", description: "Agronegócio — gestão do rebanho 100% offline (PWA): sanidade, pastagem, estoque e livro-razão; módulos de Corte, Leite e Genética; custo da arroba e do litro; sync com planilhas." },
  { code: "OFFICE", sku: "PLT-05", name: "DRAP office", price: 49, unit: "usuário/mês", description: "Produtividade (beta) — documentos, planilhas, apresentações, notas, projetos, agenda, formulários e diagramas em português, com motor de fórmulas, permissões e importação DOCX/XLSX/PPTX." },
  { code: "CONCORD", sku: "PLT-06", name: "DRAP Concord", price: 390, unit: "mês", description: "Atendimento & Agenda — agenda inteligente, CRM e atendimentos para saúde, jurídico, esporte, educação e beleza; portal do cliente, vitrine pública e apps Android/Windows/desktop." },
] as const;
type Code = (typeof PRODUCTS)[number]["code"];

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

type CompanySeed = {
  key: string; name: string; base: string; industry: string; size: string; city: string; state: string; website: string;
  contacts: { name: string; position: string; email: string; phone: string }[];
};

const COMPANIES: CompanySeed[] = [
  { key: "varandas", name: "Ateliê Varandas Arquitetura Ltda", base: "482019370001", industry: "Arquitetura", size: "11-50", city: "São Paulo", state: "SP", website: "ateliervarandas.com.br",
    contacts: [{ name: "Fernanda Varandas", position: "Sócia-diretora", email: "fernanda@ateliervarandas.com.br", phone: "(11) 98812-4410" }, { name: "Diego Matos", position: "Coordenador de projetos", email: "diego@ateliervarandas.com.br", phone: "(11) 97733-1022" }] },
  { key: "horizonte", name: "Construtora Horizonte Alto S.A.", base: "315774820001", industry: "Construção civil", size: "201-500", city: "Belo Horizonte", state: "MG", website: "horizontealto.com.br",
    contacts: [{ name: "Roberto Andrade", position: "Diretor de engenharia", email: "roberto.andrade@horizontealto.com.br", phone: "(31) 99104-5521" }, { name: "Patrícia Lemos", position: "Gerente financeira", email: "patricia.lemos@horizontealto.com.br", phone: "(31) 98422-7310" }] },
  { key: "reformaja", name: "Reforma Já Engenharia ME", base: "407731560001", industry: "Engenharia", size: "1-10", city: "Curitiba", state: "PR", website: "reformaja.eng.br",
    contacts: [{ name: "Gustavo Nogueira", position: "Engenheiro responsável", email: "gustavo@reformaja.eng.br", phone: "(41) 99231-8840" }] },
  { key: "sabermais", name: "Instituto Saber Mais Educação", base: "226109840001", industry: "Educação", size: "51-200", city: "Recife", state: "PE", website: "sabermais.edu.br",
    contacts: [{ name: "Luciana Barreto", position: "Diretora pedagógica", email: "luciana@sabermais.edu.br", phone: "(81) 99877-3015" }, { name: "Tiago Fontes", position: "Coordenador de TI", email: "tiago.ti@sabermais.edu.br", phone: "(81) 98102-6634" }] },
  { key: "vertice", name: "Escola de Negócios Vértice", base: "391256030001", industry: "Educação corporativa", size: "11-50", city: "Porto Alegre", state: "RS", website: "escolavertice.com.br",
    contacts: [{ name: "Eduardo Kessler", position: "CEO", email: "eduardo@escolavertice.com.br", phone: "(51) 99650-2287" }] },
  { key: "boavista", name: "Fazenda Boa Vista Agropecuária", base: "128843670001", industry: "Agronegócio", size: "51-200", city: "Rio Verde", state: "GO", website: "fazendaboavista.agr.br",
    contacts: [{ name: "Antônio Carvalho", position: "Proprietário", email: "antonio@fazendaboavista.agr.br", phone: "(64) 99914-0071" }, { name: "Renata Carvalho", position: "Gestora administrativa", email: "renata@fazendaboavista.agr.br", phone: "(64) 98126-4492" }] },
  { key: "santahelena", name: "Agro Santa Helena Ltda", base: "250418930001", industry: "Agronegócio", size: "11-50", city: "Sorriso", state: "MT", website: "agrosantahelena.com.br",
    contacts: [{ name: "Cláudio Bertolini", position: "Sócio-administrador", email: "claudio@agrosantahelena.com.br", phone: "(66) 99703-5518" }] },
  { key: "tresirmaos", name: "Pecuária Três Irmãos Ltda", base: "336721450001", industry: "Pecuária", size: "11-50", city: "Campo Grande", state: "MS", website: "tresirmaos.agr.br",
    contacts: [{ name: "Jorge Medeiros", position: "Gerente de rebanho", email: "jorge@tresirmaos.agr.br", phone: "(67) 99245-1180" }] },
  { key: "vitalis", name: "Clínica Vitalis Saúde Integrada", base: "198830220001", industry: "Saúde", size: "11-50", city: "Florianópolis", state: "SC", website: "clinicavitalis.com.br",
    contacts: [{ name: "Dra. Mariana Teles", position: "Diretora clínica", email: "mariana@clinicavitalis.com.br", phone: "(48) 99118-9034" }, { name: "Vanessa Quintela", position: "Coordenadora de recepção", email: "recepcao@clinicavitalis.com.br", phone: "(48) 98840-1276" }] },
  { key: "mendesprado", name: "Mendes & Prado Advogados", base: "274590610001", industry: "Jurídico", size: "11-50", city: "Rio de Janeiro", state: "RJ", website: "mendesprado.adv.br",
    contacts: [{ name: "Dr. Henrique Mendes", position: "Sócio fundador", email: "henrique@mendesprado.adv.br", phone: "(21) 99307-6612" }] },
  { key: "nebula", name: "Grupo Nébula Marketing Digital", base: "441903780001", industry: "Agência / Marketing", size: "51-200", city: "São Paulo", state: "SP", website: "gruponebula.com.br",
    contacts: [{ name: "Isabela Rangel", position: "COO", email: "isabela@gruponebula.com.br", phone: "(11) 99561-2048" }, { name: "Caio Brandão", position: "Head de operações", email: "caio@gruponebula.com.br", phone: "(11) 98234-7719" }] },
  { key: "corpomov", name: "Studio Corpo em Movimento", base: "362285190001", industry: "Esporte e bem-estar", size: "1-10", city: "Salvador", state: "BA", website: "corpoemmovimento.com.br",
    contacts: [{ name: "Aline Santana", position: "Proprietária", email: "aline@corpoemmovimento.com.br", phone: "(71) 99482-3305" }] },
];

const PEOPLE = [
  { key: "anaprado", name: "Dra. Ana Prado", base: "418273650", position: "Psicóloga clínica", email: "contato@draanaprado.com.br", phone: "(48) 99702-1145", city: "Florianópolis/SC" },
  { key: "ricardo", name: "Ricardo Albuquerque", base: "305918274", position: "Mentor financeiro", email: "ricardo@mentoriaalbuquerque.com.br", phone: "(11) 99133-8820", city: "São Paulo/SP" },
  { key: "juliana", name: "Juliana Moreira", base: "527301846", position: "Arquiteta autônoma", email: "juliana.moreira.arq@gmail.com", phone: "(21) 98871-4402", city: "Niterói/RJ" },
  { key: "sebastiao", name: "Sebastião Ferreira", base: "193846205", position: "Produtor rural (soja e milho)", email: "sebastiao.ferreira.agro@gmail.com", phone: "(64) 99630-7781", city: "Jataí/GO" },
  { key: "marcos", name: "Marcos Tavares", base: "640192837", position: "Pecuarista (corte)", email: "marcos.tavares.boi@gmail.com", phone: "(67) 99851-3390", city: "Dourados/MS" },
  { key: "camila", name: "Camila Rocha", base: "382910475", position: "Personal trainer", email: "camila.rocha.personal@gmail.com", phone: "(71) 99214-6658", city: "Salvador/BA" },
  { key: "bruno", name: "Bruno Siqueira", base: "275038194", position: "Consultor empresarial", email: "bruno@siqueiraconsultoria.com.br", phone: "(31) 99540-2213", city: "Belo Horizonte/MG" },
  { key: "helena", name: "Helena Duarte", base: "461827390", position: "Nutricionista", email: "helena.duarte.nutri@gmail.com", phone: "(41) 98815-0947", city: "Curitiba/PR" },
  { key: "paulo", name: "Paulo Henrique Lins", base: "358104726", position: "Engenheiro civil autônomo", email: "paulo.lins.eng@gmail.com", phone: "(81) 99367-5521", city: "Recife/PE" },
  { key: "larissa", name: "Larissa Campos", base: "209473815", position: "Coach de carreira", email: "larissa@larissacampos.com.br", phone: "(51) 99428-7036", city: "Porto Alegre/RS" },
];

/* ------------------------------------------------------------------ */
/* Negócios                                                            */
/* ------------------------------------------------------------------ */

type Who = "owner" | "s1" | "s2";
type DealSeed = {
  client: string; // chave de empresa ou pessoa
  title: string;
  items: [Code, number, number?][]; // produto, quantidade, desconto %
  stage: number | "WON" | "LOST"; // índice da etapa aberta
  created: number; // dias atrás
  closed?: number;
  who: Who;
  source: string;
  plan: "Mensal" | "Anual";
  users?: number;
  lost?: string;
  tags?: string[];
  close?: number; // previsão: dias à frente
};

const DEALS: DealSeed[] = [
  // ---- Ganhos (histórico de receita) ----
  { client: "varandas", title: "Backoffice anual + portal do cliente", items: [["BACKOFFICE", 12, 10]], stage: "WON", created: 190, closed: 160, who: "owner", source: "Indicação", plan: "Anual", users: 14, tags: ["VIP"] },
  { client: "sabermais", title: "Campus digital white-label", items: [["PROFESSOR", 12, 8]], stage: "WON", created: 170, closed: 128, who: "s1", source: "Evento", plan: "Anual", users: 40 },
  { client: "boavista", title: "Fazenda + Pecuária — safra 25/26", items: [["FAZENDA", 12, 12], ["PECUARIA", 12, 12]], stage: "WON", created: 150, closed: 104, who: "s2", source: "Prospecção ativa", plan: "Anual", users: 6, tags: ["VIP"] },
  { client: "anaprado", title: "Concord — agenda e vitrine pública", items: [["CONCORD", 12]], stage: "WON", created: 120, closed: 96, who: "s1", source: "Instagram", plan: "Anual", users: 1 },
  { client: "nebula", title: "DRAP office — 35 usuários", items: [["OFFICE", 420, 15]], stage: "WON", created: 110, closed: 72, who: "owner", source: "LinkedIn", plan: "Anual", users: 35 },
  { client: "sebastiao", title: "Fazenda — livro-caixa da safra", items: [["FAZENDA", 12, 5]], stage: "WON", created: 95, closed: 66, who: "s2", source: "Indicação", plan: "Anual", users: 2 },
  { client: "vitalis", title: "Concord — 6 profissionais", items: [["CONCORD", 72, 10]], stage: "WON", created: 80, closed: 41, who: "s1", source: "Google Ads", plan: "Anual", users: 6 },
  { client: "ricardo", title: "Professor — mentorias ao vivo", items: [["PROFESSOR", 12]], stage: "WON", created: 64, closed: 33, who: "owner", source: "Site", plan: "Anual", users: 1 },
  { client: "tresirmaos", title: "Pecuária — módulos Corte + Genética", items: [["PECUARIA", 12, 5]], stage: "WON", created: 52, closed: 18, who: "s2", source: "Evento", plan: "Anual", users: 4 },
  { client: "juliana", title: "Backoffice — plano profissional", items: [["BACKOFFICE", 12, 15]], stage: "WON", created: 30, closed: 6, who: "s1", source: "Instagram", plan: "Anual", users: 1 },
  { client: "mendesprado", title: "Concord + office — escritório completo", items: [["CONCORD", 12], ["OFFICE", 180, 10]], stage: "WON", created: 26, closed: 3, who: "owner", source: "Indicação", plan: "Anual", users: 15, tags: ["VIP"] },
  { client: "helena", title: "Concord mensal — consultório", items: [["CONCORD", 1]], stage: "WON", created: 12, closed: 1, who: "s1", source: "Instagram", plan: "Mensal", users: 1 },

  // ---- Perdidos ----
  { client: "reformaja", title: "Backoffice — orçamentos com BDI", items: [["BACKOFFICE", 12]], stage: "LOST", created: 140, closed: 112, who: "s2", source: "Google Ads", plan: "Anual", lost: "Preço alto — Optou por planilhas por enquanto" },
  { client: "camila", title: "Concord — agenda de alunos", items: [["CONCORD", 12]], stage: "LOST", created: 75, closed: 50, who: "s1", source: "Instagram", plan: "Anual", lost: "Momento inadequado" },
  { client: "bruno", title: "DRAP office — consultoria", items: [["OFFICE", 60]], stage: "LOST", created: 45, closed: 20, who: "owner", source: "LinkedIn", plan: "Anual", lost: "Escolheu concorrente — Fechou com suíte internacional" },
  { client: "santahelena", title: "Fazenda — conciliação OFX", items: [["FAZENDA", 12]], stage: "LOST", created: 38, closed: 9, who: "s2", source: "Evento", plan: "Anual", lost: "Sem orçamento — Retomar na próxima safra" },

  // ---- Em andamento ----
  { client: "horizonte", title: "Backoffice — 4 obras simultâneas", items: [["BACKOFFICE", 48, 15]], stage: 4, created: 34, who: "owner", source: "Prospecção ativa", plan: "Anual", users: 30, tags: ["Quente"], close: 9 },
  { client: "vertice", title: "Professor — trilhas corporativas", items: [["PROFESSOR", 12, 5]], stage: 3, created: 21, who: "s1", source: "Site", plan: "Anual", users: 25, close: 18 },
  { client: "santahelena", title: "Fazenda — retomada safra 26/27", items: [["FAZENDA", 12, 10]], stage: 0, created: 4, who: "s2", source: "Indicação", plan: "Anual", users: 3, close: 60 },
  { client: "marcos", title: "Pecuária — rebanho de 1.200 cabeças", items: [["PECUARIA", 12]], stage: 2, created: 17, who: "s2", source: "Evento", plan: "Anual", users: 2, close: 25 },
  { client: "corpomov", title: "Concord — agenda e app do aluno", items: [["CONCORD", 12]], stage: 1, created: 9, who: "s1", source: "Instagram", plan: "Anual", users: 3, close: 30 },
  { client: "paulo", title: "Backoffice — diário de obra", items: [["BACKOFFICE", 12, 5]], stage: 1, created: 11, who: "owner", source: "Google Ads", plan: "Anual", users: 1, close: 28 },
  { client: "larissa", title: "Professor — curso de transição de carreira", items: [["PROFESSOR", 12]], stage: 3, created: 24, who: "s1", source: "LinkedIn", plan: "Anual", users: 1, tags: ["Quente"], close: 7 },
  { client: "nebula", title: "Upsell — Backoffice para projetos", items: [["BACKOFFICE", 12, 10]], stage: 2, created: 14, who: "owner", source: "Indicação", plan: "Anual", users: 12, close: 21 },
  { client: "sabermais", title: "Expansão — office para professores", items: [["OFFICE", 600, 20]], stage: 4, created: 28, who: "s1", source: "Indicação", plan: "Anual", users: 50, tags: ["Quente"], close: 5 },
  { client: "boavista", title: "office — equipe administrativa", items: [["OFFICE", 96]], stage: 0, created: 6, who: "s2", source: "Indicação", plan: "Anual", users: 8, close: 45 },
  { client: "camila", title: "Concord mensal — retomada", items: [["CONCORD", 1]], stage: 0, created: 2, who: "s1", source: "WhatsApp", plan: "Mensal", users: 1, close: 15 },
  { client: "reformaja", title: "Backoffice — nova proposta enxuta", items: [["BACKOFFICE", 12, 20]], stage: 3, created: 19, who: "s2", source: "Prospecção ativa", plan: "Anual", users: 2, close: 12, tags: ["Retorno"] },
  { client: "vitalis", title: "Professor — educação de pacientes", items: [["PROFESSOR", 12]], stage: 1, created: 8, who: "s1", source: "Indicação", plan: "Anual", users: 3, close: 40 },
  { client: "bruno", title: "Concord — agenda de consultorias", items: [["CONCORD", 12]], stage: 2, created: 26, who: "owner", source: "Site", plan: "Anual", users: 1, close: 3 },
];

const RENEWALS: { client: string; title: string; items: [Code, number, number?][]; stage: number; who: Who; close: number }[] = [
  { client: "varandas", title: "Renovação anual — Backoffice", items: [["BACKOFFICE", 12, 10]], stage: 1, who: "owner", close: 20 },
  { client: "sabermais", title: "Renovação — Campus digital", items: [["PROFESSOR", 12, 8]], stage: 0, who: "s1", close: 45 },
  { client: "boavista", title: "Renovação safra 26/27", items: [["FAZENDA", 12, 12], ["PECUARIA", 12, 12]], stage: 2, who: "s2", close: 60 },
  { client: "anaprado", title: "Upgrade — Concord com 2 profissionais", items: [["CONCORD", 24, 5]], stage: 3, who: "s1", close: 10 },
];

/* ------------------------------------------------------------------ */

export async function seedPresentation(email: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() }, include: { memberships: { include: { org: true }, orderBy: { createdAt: "asc" } } } });
  if (!user) throw new Error(`Usuário ${email} não encontrado`);
  const m = user.memberships.find((x) => x.role === "OWNER") ?? user.memberships[0];
  if (!m) throw new Error("Usuário sem empresa");
  const org = m.org;
  const orgId = org.id;
  const settings = (org.settings ?? {}) as Record<string, unknown>;
  if (settings.presentationSeeded) throw new Error(`A empresa "${org.name}" já recebeu os dados de apresentação`);
  if (settings.presentationSeeding) throw new Error(`A carga da empresa "${org.name}" já foi iniciada em ${settings.presentationSeeding}`);
  if (await db.product.count({ where: { orgId, sku: "PLT-01" } })) throw new Error(`A empresa "${org.name}" já possui os produtos DRAP`);
  await db.organization.update({ where: { id: orgId }, data: { settings: { ...settings, presentationSeeding: new Date().toISOString() } } });

  /* ---------- equipe fictícia ---------- */
  const pw = await bcrypt.hash(randomBytes(18).toString("base64url"), 10);
  const slug = org.slug.replace(/[^a-z0-9]/g, "");
  const mkSeller = async (name: string, mail: string, color: string) => {
    const u = await db.user.upsert({ where: { email: mail }, update: {}, create: { name, email: mail, passwordHash: pw, avatarColor: color } });
    await db.membership.upsert({ where: { userId_orgId: { userId: u.id, orgId } }, update: {}, create: { userId: u.id, orgId, role: "SALES" } });
    return u.id;
  };
  const owners: Record<Who, string> = {
    owner: user.id,
    s1: await mkSeller("Marina Lopes", `marina.lopes+${slug}@demo.drap.app`, "#ec4899"),
    s2: await mkSeller("Rafael Couto", `rafael.couto+${slug}@demo.drap.app`, "#10b981"),
  };

  /* ---------- funis ---------- */
  const pipeline = await db.pipeline.findFirst({ where: { orgId, isDefault: true }, include: { stages: { orderBy: { position: "asc" } } } })
    ?? (await db.pipeline.findFirstOrThrow({ where: { orgId }, include: { stages: { orderBy: { position: "asc" } } } }));
  const open = pipeline.stages.filter((s) => s.type === "OPEN");
  const won = pipeline.stages.find((s) => s.type === "WON")!;
  const lost = pipeline.stages.find((s) => s.type === "LOST")!;

  const renewal = await db.pipeline.create({ data: { orgId, name: "Renovação & Expansão", position: 1 } });
  await db.stage.createMany({
    data: [
      { pipelineId: renewal.id, name: "Renovação em 90 dias", color: "#0ea5e9", probability: 40, position: 0, rottingDays: 15 },
      { pipelineId: renewal.id, name: "Contato realizado", color: "#8b5cf6", probability: 60, position: 1, rottingDays: 10 },
      { pipelineId: renewal.id, name: "Proposta de renovação", color: "#f59e0b", probability: 80, position: 2, rottingDays: 10 },
      { pipelineId: renewal.id, name: "Upsell em negociação", color: "#ec4899", probability: 85, position: 3, rottingDays: 7 },
      { pipelineId: renewal.id, name: "Renovado", color: "#16a34a", probability: 100, position: 100, type: "WON" },
      { pipelineId: renewal.id, name: "Cancelado", color: "#dc2626", probability: 0, position: 101, type: "LOST" },
    ],
  });
  const rStages = await db.stage.findMany({ where: { pipelineId: renewal.id, type: "OPEN" }, orderBy: { position: "asc" } });

  /* ---------- campos, etiquetas, motivos ---------- */
  const fields: Prisma.CustomFieldCreateManyInput[] = [
    { orgId, entity: "CONTACT", key: "tipo_cliente", label: "Tipo de cliente", type: "SELECT", options: ["Pessoa física", "Pessoa jurídica"], position: 0 },
    { orgId, entity: "CONTACT", key: "cpf", label: "CPF", type: "TEXT", position: 1 },
    { orgId, entity: "CONTACT", key: "cidade", label: "Cidade/UF", type: "TEXT", position: 2 },
    { orgId, entity: "COMPANY", key: "plataforma", label: "Plataforma DRAP", type: "MULTISELECT", options: PRODUCTS.map((p) => p.name), position: 0 },
    { orgId, entity: "COMPANY", key: "ie", label: "Inscrição estadual", type: "TEXT", position: 1 },
    { orgId, entity: "DEAL", key: "plano", label: "Ciclo de cobrança", type: "SELECT", options: ["Mensal", "Anual"], position: 0 },
    { orgId, entity: "DEAL", key: "usuarios", label: "Nº de usuários", type: "NUMBER", position: 1 },
    { orgId, entity: "DEAL", key: "produto_principal", label: "Produto principal", type: "SELECT", options: PRODUCTS.map((p) => p.name), position: 2 },
  ];
  for (const f of fields) await db.customField.upsert({ where: { orgId_entity_key: { orgId, entity: f.entity, key: f.key } }, update: {}, create: f });
  for (const [name, color] of [["Quente", "#ef4444"], ["VIP", "#a855f7"], ["Retorno", "#0ea5e9"], ["Trial ativo", "#10b981"], ["Upsell", "#f59e0b"]] as const)
    await db.tag.upsert({ where: { orgId_name: { orgId, name } }, update: {}, create: { orgId, name, color } });

  /* ---------- produtos ---------- */
  const prod = {} as Record<Code, { id: string; price: number; name: string }>;
  for (const p of PRODUCTS) {
    const created = await db.product.create({ data: { orgId, name: p.name, sku: p.sku, price: p.price, unit: p.unit, description: p.description, active: true } });
    prod[p.code] = { id: created.id, price: p.price, name: p.name };
  }

  /* ---------- clientes ---------- */
  const companyId: Record<string, string> = {};
  const contactId: Record<string, string> = {};
  const productsOf = (key: string) => [...new Set([...DEALS, ...RENEWALS].filter((d) => d.client === key).flatMap((d) => d.items.map(([c]) => prod[c].name)))];
  for (const [i, c] of COMPANIES.entries()) {
    const co = await db.company.create({
      data: {
        orgId, name: c.name, document: cnpj(c.base), industry: c.industry, size: c.size, city: c.city, state: c.state, country: "Brasil",
        website: c.website, domain: c.website, email: c.contacts[0]!.email, phone: c.contacts[0]!.phone, ownerId: owners[(["owner", "s1", "s2"] as Who[])[i % 3]!],
        address: `Av. Central, ${120 + i * 37} — Centro`, customFields: { plataforma: productsOf(c.key), ie: String(100000000 + i * 7919731).slice(0, 9) },
        createdAt: ago(200 - i * 6),
      },
    });
    companyId[c.key] = co.id;
    for (const [j, p] of c.contacts.entries()) {
      const ct = await db.contact.create({
        data: {
          orgId, name: p.name, position: p.position, email: p.email, phone: p.phone, whatsapp: p.phone.replace(/\D/g, "").replace(/^/, "55"),
          companyId: co.id, ownerId: co.ownerId, source: "Prospecção ativa", lifecycle: "sql", createdAt: ago(200 - i * 6),
          customFields: { tipo_cliente: "Pessoa jurídica", cidade: `${c.city}/${c.state}` },
        },
      });
      if (j === 0) contactId[c.key] = ct.id;
    }
  }
  for (const [i, p] of PEOPLE.entries()) {
    const ct = await db.contact.create({
      data: {
        orgId, name: p.name, position: p.position, email: p.email, phone: p.phone, whatsapp: "55" + p.phone.replace(/\D/g, ""),
        ownerId: owners[(["s1", "owner", "s2"] as Who[])[i % 3]!], source: "Instagram", lifecycle: "mql", createdAt: ago(150 - i * 9),
        customFields: { tipo_cliente: "Pessoa física", cpf: cpf(p.base), cidade: p.city },
        birthday: new Date(1980 + (i % 15), (i * 5) % 12, 3 + i * 2),
      },
    });
    contactId[p.key] = ct.id;
  }

  /* ---------- negócios ---------- */
  const valueOf = (items: [Code, number, number?][]) =>
    Math.round(items.reduce((s, [c, q, disc]) => s + prod[c].price * q * (1 - (disc ?? 0) / 100), 0) * 100) / 100;
  const ACT_TITLES: Record<number, [ActivityType, string][]> = {
    0: [["CALL", "Ligação de descoberta"], ["WHATSAPP", "Primeiro contato pelo WhatsApp"]],
    1: [["MEETING", "Reunião de qualificação"], ["EMAIL", "Enviar material da plataforma"]],
    2: [["MEETING", "Demonstração da plataforma"], ["TASK", "Preparar ambiente de demonstração"]],
    3: [["EMAIL", "Enviar proposta comercial"], ["CALL", "Follow-up da proposta"]],
    4: [["MEETING", "Reunião de negociação final"], ["TASK", "Ajustar condições do contrato"]],
  };
  const lifecycle: Record<string, string> = {};
  let pos = 0;

  const createDeal = async (d: { client: string; title: string; items: [Code, number, number?][]; who: Who; source: string; plan: string; users?: number; tags?: string[] }, p: typeof pipeline | { id: string }, stageId: string, extra: Partial<Prisma.DealUncheckedCreateInput>) => {
    const isPerson = !companyId[d.client];
    const deal = await db.deal.create({
      data: {
        orgId, title: d.title, value: valueOf(d.items), pipelineId: p.id, stageId,
        contactId: contactId[d.client], companyId: isPerson ? null : companyId[d.client], ownerId: owners[d.who],
        source: d.source, tags: d.tags ?? [], position: (pos += 1000),
        customFields: { plano: d.plan, usuarios: String(d.users ?? 1), produto_principal: prod[d.items[0]![0]].name },
        ...extra,
      },
    });
    await db.dealProduct.createMany({
      data: d.items.map(([c, q, disc]) => ({ dealId: deal.id, productId: prod[c].id, quantity: q, price: prod[c].price, discount: disc ?? 0 })),
    });
    return deal;
  };

  for (const d of DEALS) {
    const created = ago(d.created);
    const status = d.stage === "WON" ? "WON" : d.stage === "LOST" ? "LOST" : "OPEN";
    const reachIdx = status === "OPEN" ? (d.stage as number) : status === "WON" ? open.length - 1 : Math.min(2, open.length - 1);
    const closedAt = d.closed != null ? ago(d.closed, 16) : null;
    const span = (closedAt ? closedAt.getTime() : Date.now() - 2 * day) - created.getTime();
    const stepAt = (k: number) => new Date(created.getTime() + (span * (k + 1)) / (reachIdx + 2));
    const stageId = status === "WON" ? won.id : status === "LOST" ? lost.id : open[reachIdx]!.id;
    const stageChangedAt = closedAt ?? (reachIdx > 0 ? stepAt(reachIdx - 1) : created);

    const deal = await createDeal(d, pipeline, stageId, {
      status, closedAt, createdAt: created, stageChangedAt, lostReason: d.lost ?? null,
      expectedClose: d.close != null ? new Date(Date.now() + d.close * day) : closedAt,
    });
    const who = owners[d.who];
    const ev: Prisma.TimelineEventCreateManyInput[] = [{ orgId, type: "DEAL_CREATED", dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, userId: who, createdAt: created }];
    for (let k = 1; k <= reachIdx; k++)
      ev.push({ orgId, type: "DEAL_STAGE", dealId: deal.id, userId: who, createdAt: stepAt(k - 1), data: { from: open[k - 1]!.name, to: open[k]!.name } });
    if (status === "WON") ev.push({ orgId, type: "DEAL_WON", dealId: deal.id, userId: who, createdAt: closedAt! });
    if (status === "LOST") ev.push({ orgId, type: "DEAL_LOST", dealId: deal.id, userId: who, createdAt: closedAt!, data: { reason: d.lost ?? "" } });
    await db.timelineEvent.createMany({ data: ev });

    // atividades já realizadas em cada etapa
    const acts: Prisma.ActivityCreateManyInput[] = [];
    for (let k = 0; k <= reachIdx; k++) {
      const [type, title] = ACT_TITLES[k]![0]!;
      const at = k === 0 ? new Date(created.getTime() + day / 2) : stepAt(k - 1);
      acts.push({ orgId, type, title, dueAt: at, done: true, doneAt: at, duration: type === "MEETING" ? 45 : 15, dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, assigneeId: who, createdById: who });
    }
    if (status === "WON") {
      acts.push({ orgId, type: "MEETING", title: "Onboarding e configuração inicial", dueAt: new Date(closedAt!.getTime() + 2 * day), done: d.closed! > 2, doneAt: d.closed! > 2 ? new Date(closedAt!.getTime() + 2 * day) : null, duration: 60, dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, assigneeId: who, createdById: who, description: "Criar ambiente, importar dados e treinar os usuários-chave." });
    }
    if (status === "OPEN") {
      // próxima atividade: algumas atrasadas, a maioria futura
      const [type, title] = ACT_TITLES[reachIdx]![1]!;
      const offset = d.close != null && d.close <= 7 ? -1 : (d.created % 5) + 1;
      const due = new Date(Date.now() + offset * day);
      due.setHours(9 + (d.created % 8), 30, 0, 0);
      acts.push({ orgId, type, title, dueAt: due, duration: 30, dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, assigneeId: who, createdById: who });
    }
    await db.activity.createMany({ data: acts });

    lifecycle[d.client] = status === "WON" ? "customer" : lifecycle[d.client] === "customer" ? "customer" : status === "OPEN" ? "sql" : lifecycle[d.client] ?? "lead";
  }

  // funil de renovação
  for (const r of RENEWALS) {
    const deal = await createDeal({ ...r, source: "Base de clientes", plan: "Anual", tags: ["Upsell"] }, renewal, rStages[r.stage]!.id, {
      createdAt: ago(20 - r.stage * 3), stageChangedAt: ago(8 - r.stage), expectedClose: new Date(Date.now() + r.close * day),
    });
    await db.timelineEvent.create({ data: { orgId, type: "DEAL_CREATED", dealId: deal.id, userId: owners[r.who], createdAt: ago(20 - r.stage * 3) } });
    const due = new Date(Date.now() + (r.stage + 2) * day);
    due.setHours(14, 0, 0, 0);
    await db.activity.create({ data: { orgId, type: "CALL", title: "Alinhar renovação e novas necessidades", dueAt: due, dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, assigneeId: owners[r.who], createdById: owners[r.who] } });
  }

  for (const [key, lc] of Object.entries(lifecycle)) {
    if (companyId[key]) await db.contact.updateMany({ where: { companyId: companyId[key] }, data: { lifecycle: lc } });
    else await db.contact.update({ where: { id: contactId[key]! }, data: { lifecycle: lc } });
  }

  /* ---------- notas ---------- */
  const noteFor = async (client: string, content: string, pinned = false, daysAgo = 5) => {
    const deal = await db.deal.findFirst({ where: { orgId, contactId: contactId[client] }, orderBy: { createdAt: "desc" } });
    await db.note.create({ data: { orgId, content, pinned, authorId: user.id, dealId: deal?.id, contactId: contactId[client], companyId: companyId[client] ?? null, createdAt: ago(daysAgo) } });
  };
  await noteFor("horizonte", "Diretoria aprovou o orçamento. Pediram 15% de desconto para fechar contrato anual com 4 obras. Jurídico revisando o contrato — previsão de assinatura na próxima semana.", true, 2);
  await noteFor("sabermais", "Escola quer o office para 50 professores. Ponto de atenção: integração com o campus digital já contratado (SSO).", true, 4);
  await noteFor("larissa", "Gostou muito da demonstração das trilhas por nível. Quer lançar o curso em janeiro — oferecer implantação expressa.", false, 3);
  await noteFor("varandas", "Cliente referência: aceitou gravar depoimento em vídeo sobre a Prancheta (DWG/IFC no navegador).", true, 40);
  await noteFor("reformaja", "Perdemos em agosto por preço. Retomamos com proposta enxuta (2 usuários, 20% off no anual).", false, 15);
  await noteFor("marcos", "Opera sem sinal na maior parte da fazenda — destacar o modo 100% offline (PWA) na demo.", false, 12);
  await noteFor("bruno", "Fechou o office com concorrente, mas tem interesse no Concord para agenda das consultorias.", false, 20);

  /* ---------- metas ---------- */
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await db.goal.create({ data: { orgId, period: ym, metric: "REVENUE", target: 60000 } });
  await db.goal.create({ data: { orgId, period: ym, metric: "DEALS_WON", target: 6 } });
  await db.goal.create({ data: { orgId, period: ym, metric: "REVENUE", target: 25000, userId: owners.s1 } });
  await db.goal.create({ data: { orgId, period: ym, metric: "REVENUE", target: 20000, userId: owners.s2 } });

  /* ---------- automações ---------- */
  const proposta = open[Math.min(3, open.length - 1)]!;
  await db.automation.createMany({
    data: [
      { orgId, name: "Follow-up 2 dias após proposta", trigger: "DEAL_STAGE_ENTERED", stageId: proposta.id, action: "CREATE_ACTIVITY", config: { activityType: "CALL", title: "Follow-up da proposta: {negocio}", daysOffset: 2 } },
      { orgId, name: "Onboarding do novo cliente", trigger: "DEAL_WON", action: "CREATE_ACTIVITY", config: { activityType: "MEETING", title: "Onboarding: {negocio}", daysOffset: 1 } },
      { orgId, name: "Primeiro contato em até 24h", trigger: "DEAL_CREATED", action: "CREATE_ACTIVITY", config: { activityType: "WHATSAPP", title: "Primeiro contato: {negocio}", daysOffset: 0 } },
    ],
  });

  await db.organization.update({ where: { id: orgId }, data: { settings: { ...settings, presentationSeeding: undefined, presentationSeeded: new Date().toISOString() } } });

  return {
    org: org.name,
    products: PRODUCTS.length,
    companies: COMPANIES.length,
    peopleClients: PEOPLE.length,
    contacts: COMPANIES.reduce((s, c) => s + c.contacts.length, 0) + PEOPLE.length,
    deals: DEALS.length + RENEWALS.length,
  };
}

/** Situação da carga numa conta, sem alterar nada. */
export async function presentationStatus(email: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() }, include: { memberships: { include: { org: true }, orderBy: { createdAt: "asc" } } } });
  if (!user) return { user: false };
  const m = user.memberships.find((x) => x.role === "OWNER") ?? user.memberships[0];
  if (!m) return { user: true, org: null };
  const orgId = m.orgId;
  const s = (m.org.settings ?? {}) as Record<string, unknown>;
  const [products, companies, contacts, deals, activities, pipelines] = await Promise.all([
    db.product.count({ where: { orgId } }),
    db.company.count({ where: { orgId } }),
    db.contact.count({ where: { orgId } }),
    db.deal.count({ where: { orgId } }),
    db.activity.count({ where: { orgId } }),
    db.pipeline.count({ where: { orgId } }),
  ]);
  return { user: true, org: m.org.name, seeding: s.presentationSeeding ?? null, seeded: s.presentationSeeded ?? null, products, companies, contacts, deals, activities, pipelines };
}
