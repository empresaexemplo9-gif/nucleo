/** Modelos prontos de módulos de controle interno e pacotes por segmento. */

export type TplField = {
  key: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  list?: boolean;
  due?: boolean;
  amount?: boolean;
};
export type TplStatus = { name: string; color: string; final?: boolean };
export type ModuleTemplate = {
  key: string;
  name: string;
  singular: string;
  description: string;
  icon: string;
  color: string;
  prefix: string;
  fields: TplField[];
  statuses: TplStatus[];
};

const PRIO = ["Baixa", "Média", "Alta", "Urgente"];
const C = { mute: "#7d828c", blue: "#3c78c0", deep: "#2d63a3", gold: "#b48a4f", bronze: "#8a672f", ok: "#17905f", err: "#cf3a56", warn: "#b7791f" };

export const MODULE_TEMPLATES: ModuleTemplate[] = [
  {
    key: "ordens-servico", name: "Ordens de serviço", singular: "Ordem de serviço", prefix: "OS", icon: "wrench", color: C.gold,
    description: "Abertura, agendamento e execução de serviços para clientes.",
    fields: [
      { key: "cliente", label: "Cliente", type: "CONTACT", list: true },
      { key: "empresa", label: "Empresa", type: "COMPANY" },
      { key: "tipo", label: "Tipo de serviço", type: "SELECT", options: ["Instalação", "Manutenção", "Visita técnica", "Reparo", "Orçamento"], list: true },
      { key: "prioridade", label: "Prioridade", type: "SELECT", options: PRIO, list: true },
      { key: "agendada", label: "Data agendada", type: "DATE", list: true, due: true },
      { key: "endereco", label: "Endereço", type: "TEXT" },
      { key: "valor", label: "Valor", type: "CURRENCY", list: true, amount: true },
      { key: "descricao", label: "Descrição do serviço", type: "TEXTAREA" },
    ],
    statuses: [{ name: "Aberta", color: C.mute }, { name: "Agendada", color: C.blue }, { name: "Em execução", color: C.gold }, { name: "Aguardando peças", color: C.warn }, { name: "Concluída", color: C.ok, final: true }, { name: "Cancelada", color: C.err, final: true }],
  },
  {
    key: "chamados", name: "Chamados internos", singular: "Chamado", prefix: "CH", icon: "life-buoy", color: C.blue,
    description: "Help desk interno: solicitações entre áreas com prioridade e prazo.",
    fields: [
      { key: "departamento", label: "Departamento", type: "SELECT", options: ["TI", "RH", "Financeiro", "Operações", "Comercial", "Administrativo"], list: true },
      { key: "categoria", label: "Categoria", type: "SELECT", options: ["Acesso", "Equipamento", "Sistema", "Solicitação", "Dúvida"], list: true },
      { key: "prioridade", label: "Prioridade", type: "SELECT", options: PRIO, list: true },
      { key: "prazo", label: "Prazo", type: "DATE", list: true, due: true },
      { key: "descricao", label: "Descrição", type: "TEXTAREA" },
    ],
    statuses: [{ name: "Novo", color: C.mute }, { name: "Em atendimento", color: C.blue }, { name: "Aguardando solicitante", color: C.warn }, { name: "Resolvido", color: C.ok, final: true }],
  },
  {
    key: "estoque", name: "Estoque", singular: "Item", prefix: "ITEM", icon: "boxes", color: C.bronze,
    description: "Itens, quantidades, estoque mínimo, custo e localização.",
    fields: [
      { key: "sku", label: "Código / SKU", type: "TEXT", list: true },
      { key: "categoria", label: "Categoria", type: "SELECT", options: ["Matéria-prima", "Produto acabado", "Insumo", "Material de escritório", "Peça de reposição"], list: true },
      { key: "quantidade", label: "Quantidade", type: "NUMBER", list: true },
      { key: "minimo", label: "Estoque mínimo", type: "NUMBER", list: true },
      { key: "unidade", label: "Unidade", type: "SELECT", options: ["un", "kg", "l", "m", "cx", "pct"] },
      { key: "custo", label: "Custo unitário", type: "CURRENCY", list: true, amount: true },
      { key: "local", label: "Localização", type: "TEXT" },
      { key: "fornecedor", label: "Fornecedor", type: "COMPANY" },
    ],
    statuses: [{ name: "Disponível", color: C.ok }, { name: "Estoque baixo", color: C.warn }, { name: "Em falta", color: C.err }, { name: "Descontinuado", color: C.mute, final: true }],
  },
  {
    key: "compras", name: "Requisições de compra", singular: "Requisição", prefix: "RC", icon: "shopping-cart", color: C.deep,
    description: "Pedidos internos de compra com cotação e aprovação.",
    fields: [
      { key: "fornecedor", label: "Fornecedor", type: "COMPANY", list: true },
      { key: "centro_custo", label: "Centro de custo", type: "SELECT", options: ["Administrativo", "Comercial", "Operações", "Produção", "TI"], list: true },
      { key: "valor", label: "Valor estimado", type: "CURRENCY", list: true, amount: true },
      { key: "necessario", label: "Necessário até", type: "DATE", list: true, due: true },
      { key: "itens", label: "Itens", type: "TEXTAREA" },
      { key: "justificativa", label: "Justificativa", type: "TEXTAREA" },
    ],
    statuses: [{ name: "Solicitada", color: C.mute }, { name: "Em cotação", color: C.blue }, { name: "Aprovada", color: C.gold }, { name: "Pedido emitido", color: C.deep }, { name: "Recebida", color: C.ok, final: true }, { name: "Reprovada", color: C.err, final: true }],
  },
  {
    key: "financeiro", name: "Financeiro", singular: "Lançamento", prefix: "FIN", icon: "wallet", color: C.ok,
    description: "Contas a pagar e a receber, vencimentos, categorias e centros de custo.",
    fields: [
      { key: "tipo", label: "Tipo", type: "SELECT", options: ["Receita", "Despesa"], required: true, list: true },
      { key: "categoria", label: "Categoria", type: "SELECT", options: ["Vendas", "Serviços", "Folha", "Impostos", "Aluguel", "Fornecedores", "Marketing", "Outros"], list: true },
      { key: "centro_custo", label: "Centro de custo", type: "SELECT", options: ["Administrativo", "Comercial", "Operações", "Produção"] },
      { key: "valor", label: "Valor", type: "CURRENCY", required: true, list: true, amount: true },
      { key: "vencimento", label: "Vencimento", type: "DATE", list: true, due: true },
      { key: "forma", label: "Forma de pagamento", type: "SELECT", options: ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro"] },
      { key: "cliente", label: "Cliente", type: "CONTACT" },
      { key: "fornecedor", label: "Fornecedor / empresa", type: "COMPANY" },
      { key: "documento", label: "Documento / NF", type: "TEXT" },
    ],
    statuses: [{ name: "Em aberto", color: C.blue }, { name: "Agendado", color: C.gold }, { name: "Pago / recebido", color: C.ok, final: true }, { name: "Cancelado", color: C.err, final: true }],
  },
  {
    key: "patrimonio", name: "Patrimônio", singular: "Bem", prefix: "PAT", icon: "package", color: C.mute,
    description: "Bens e ativos: localização, responsável, valor e situação.",
    fields: [
      { key: "plaqueta", label: "Nº de patrimônio", type: "TEXT", list: true },
      { key: "categoria", label: "Categoria", type: "SELECT", options: ["Informática", "Mobiliário", "Máquinas", "Veículos", "Ferramentas"], list: true },
      { key: "local", label: "Localização", type: "TEXT", list: true },
      { key: "serie", label: "Nº de série", type: "TEXT" },
      { key: "aquisicao", label: "Data de aquisição", type: "DATE" },
      { key: "valor", label: "Valor de aquisição", type: "CURRENCY", list: true, amount: true },
    ],
    statuses: [{ name: "Em uso", color: C.ok }, { name: "Em manutenção", color: C.warn }, { name: "Em estoque", color: C.blue }, { name: "Baixado", color: C.mute, final: true }],
  },
  {
    key: "contratos", name: "Vigência de contratos", singular: "Contrato", prefix: "CT", icon: "file-signature", color: C.gold,
    description: "Contratos com clientes e fornecedores, vigência e renovação.",
    fields: [
      { key: "cliente", label: "Contato", type: "CONTACT" },
      { key: "empresa", label: "Empresa", type: "COMPANY", list: true },
      { key: "valor", label: "Valor mensal", type: "CURRENCY", list: true, amount: true },
      { key: "inicio", label: "Início", type: "DATE" },
      { key: "fim", label: "Vencimento", type: "DATE", list: true, due: true },
      { key: "renovacao", label: "Renovação automática", type: "BOOLEAN", list: true },
      { key: "reajuste", label: "Índice de reajuste", type: "SELECT", options: ["IPCA", "IGP-M", "INPC", "Sem reajuste"] },
      { key: "arquivo", label: "Link do contrato", type: "URL" },
    ],
    statuses: [{ name: "Em elaboração", color: C.mute }, { name: "Ativo", color: C.ok }, { name: "Em renovação", color: C.warn }, { name: "Encerrado", color: C.err, final: true }],
  },
  {
    key: "projetos", name: "Projetos", singular: "Projeto", prefix: "PRJ", icon: "folder-kanban", color: C.blue,
    description: "Projetos internos ou de clientes, orçamento e entregas.",
    fields: [
      { key: "cliente", label: "Cliente", type: "COMPANY", list: true },
      { key: "orcamento", label: "Orçamento", type: "CURRENCY", list: true, amount: true },
      { key: "inicio", label: "Início", type: "DATE" },
      { key: "entrega", label: "Entrega", type: "DATE", list: true, due: true },
      { key: "prioridade", label: "Prioridade", type: "SELECT", options: PRIO, list: true },
      { key: "escopo", label: "Escopo", type: "TEXTAREA" },
    ],
    statuses: [{ name: "Planejamento", color: C.mute }, { name: "Em andamento", color: C.blue }, { name: "Em revisão", color: C.gold }, { name: "Pausado", color: C.warn }, { name: "Entregue", color: C.ok, final: true }],
  },
  {
    key: "frota", name: "Controle de frota", singular: "Veículo", prefix: "VEI", icon: "truck", color: C.deep,
    description: "Veículos e máquinas: quilometragem, revisões e custos.",
    fields: [
      { key: "placa", label: "Placa / identificação", type: "TEXT", list: true },
      { key: "modelo", label: "Modelo", type: "TEXT", list: true },
      { key: "ano", label: "Ano", type: "NUMBER" },
      { key: "km", label: "Km / horímetro atual", type: "NUMBER", list: true },
      { key: "revisao", label: "Próxima revisão", type: "DATE", list: true, due: true },
      { key: "custo", label: "Custo mensal", type: "CURRENCY", amount: true },
    ],
    statuses: [{ name: "Disponível", color: C.ok }, { name: "Em uso", color: C.blue }, { name: "Em manutenção", color: C.warn }, { name: "Inativo", color: C.mute, final: true }],
  },
  {
    key: "colaboradores", name: "Colaboradores", singular: "Colaborador", prefix: "COL", icon: "id-card", color: C.bronze,
    description: "Cadastro da equipe: cargo, departamento, vínculo e situação.",
    fields: [
      { key: "cargo", label: "Cargo", type: "TEXT", list: true },
      { key: "departamento", label: "Departamento", type: "SELECT", options: ["Administrativo", "Comercial", "Operações", "Financeiro", "TI", "RH"], list: true },
      { key: "vinculo", label: "Vínculo", type: "SELECT", options: ["CLT", "PJ", "Estágio", "Temporário"], list: true },
      { key: "admissao", label: "Admissão", type: "DATE" },
      { key: "email", label: "E-mail", type: "EMAIL" },
      { key: "telefone", label: "Telefone", type: "PHONE" },
      { key: "ferias", label: "Próximas férias", type: "DATE", due: true },
    ],
    statuses: [{ name: "Ativo", color: C.ok }, { name: "Férias", color: C.blue }, { name: "Afastado", color: C.warn }, { name: "Desligado", color: C.mute, final: true }],
  },
  {
    key: "documentos", name: "Documentos e licenças", singular: "Documento", prefix: "DOC", icon: "file-check", color: C.warn,
    description: "Alvarás, licenças, certidões e certificados com controle de validade.",
    fields: [
      { key: "tipo", label: "Tipo", type: "SELECT", options: ["Alvará", "Licença ambiental", "AVCB", "Certidão", "Certificado digital", "Registro profissional"], list: true },
      { key: "orgao", label: "Órgão emissor", type: "TEXT", list: true },
      { key: "emissao", label: "Emissão", type: "DATE" },
      { key: "validade", label: "Validade", type: "DATE", list: true, due: true },
      { key: "arquivo", label: "Link do documento", type: "URL" },
    ],
    statuses: [{ name: "Válido", color: C.ok }, { name: "A vencer", color: C.warn }, { name: "Vencido", color: C.err }, { name: "Arquivado", color: C.mute, final: true }],
  },
  {
    key: "manutencoes", name: "Manutenções preventivas", singular: "Manutenção", prefix: "MP", icon: "calendar-clock", color: C.mute,
    description: "Plano de manutenção de equipamentos com periodicidade e custos.",
    fields: [
      { key: "equipamento", label: "Equipamento", type: "TEXT", list: true },
      { key: "periodicidade", label: "Periodicidade", type: "SELECT", options: ["Mensal", "Trimestral", "Semestral", "Anual"], list: true },
      { key: "proxima", label: "Próxima execução", type: "DATE", list: true, due: true },
      { key: "custo", label: "Custo", type: "CURRENCY", list: true, amount: true },
      { key: "fornecedor", label: "Fornecedor", type: "COMPANY" },
      { key: "checklist", label: "Checklist", type: "TEXTAREA" },
    ],
    statuses: [{ name: "Programada", color: C.blue }, { name: "Em execução", color: C.gold }, { name: "Atrasada", color: C.err }, { name: "Concluída", color: C.ok, final: true }],
  },
  {
    key: "talhoes", name: "Talhões e safras", singular: "Talhão", prefix: "TL", icon: "sprout", color: C.ok,
    description: "Áreas de plantio por safra: cultura, hectares, datas e custos.",
    fields: [
      { key: "cultura", label: "Cultura", type: "SELECT", options: ["Soja", "Milho", "Café", "Cana", "Algodão", "Trigo", "Pastagem"], list: true },
      { key: "area", label: "Área (ha)", type: "NUMBER", list: true },
      { key: "safra", label: "Safra", type: "TEXT", list: true },
      { key: "plantio", label: "Plantio", type: "DATE" },
      { key: "colheita", label: "Colheita prevista", type: "DATE", list: true, due: true },
      { key: "custo", label: "Custo total", type: "CURRENCY", amount: true },
    ],
    statuses: [{ name: "Preparo do solo", color: C.mute }, { name: "Plantado", color: C.blue }, { name: "Em desenvolvimento", color: C.gold }, { name: "Colhido", color: C.ok, final: true }],
  },
  {
    key: "atendimentos", name: "Atendimentos", singular: "Atendimento", prefix: "AT", icon: "stethoscope", color: C.blue,
    description: "Agenda de atendimentos, consultas e procedimentos.",
    fields: [
      { key: "paciente", label: "Paciente / cliente", type: "CONTACT", required: true, list: true },
      { key: "data", label: "Data", type: "DATE", list: true, due: true },
      { key: "tipo", label: "Tipo", type: "SELECT", options: ["Consulta", "Retorno", "Exame", "Procedimento", "Avaliação"], list: true },
      { key: "convenio", label: "Convênio", type: "SELECT", options: ["Particular", "Unimed", "Bradesco Saúde", "SulAmérica", "Outro"] },
      { key: "valor", label: "Valor", type: "CURRENCY", list: true, amount: true },
      { key: "observacoes", label: "Observações", type: "TEXTAREA" },
    ],
    statuses: [{ name: "Agendado", color: C.blue }, { name: "Confirmado", color: C.gold }, { name: "Realizado", color: C.ok, final: true }, { name: "Faltou", color: C.warn, final: true }, { name: "Cancelado", color: C.err, final: true }],
  },
  {
    key: "matriculas", name: "Matrículas", singular: "Matrícula", prefix: "MAT", icon: "graduation-cap", color: C.deep,
    description: "Alunos, cursos, turmas e mensalidades.",
    fields: [
      { key: "aluno", label: "Aluno", type: "CONTACT", required: true, list: true },
      { key: "curso", label: "Curso", type: "TEXT", list: true },
      { key: "turma", label: "Turma", type: "TEXT", list: true },
      { key: "inicio", label: "Início", type: "DATE" },
      { key: "mensalidade", label: "Mensalidade", type: "CURRENCY", list: true, amount: true },
      { key: "vencimento", label: "Próximo vencimento", type: "DATE", due: true },
    ],
    statuses: [{ name: "Pré-matrícula", color: C.mute }, { name: "Ativa", color: C.ok }, { name: "Trancada", color: C.warn }, { name: "Concluída", color: C.blue, final: true }, { name: "Cancelada", color: C.err, final: true }],
  },
  {
    key: "processos", name: "Processos", singular: "Processo", prefix: "PROC", icon: "scale", color: C.bronze,
    description: "Processos e casos: partes, área, prazos e valores.",
    fields: [
      { key: "numero", label: "Nº do processo", type: "TEXT", list: true },
      { key: "cliente", label: "Cliente", type: "CONTACT", list: true },
      { key: "area", label: "Área", type: "SELECT", options: ["Cível", "Trabalhista", "Tributário", "Família", "Empresarial", "Criminal"], list: true },
      { key: "vara", label: "Vara / tribunal", type: "TEXT" },
      { key: "prazo", label: "Próximo prazo", type: "DATE", list: true, due: true },
      { key: "valor", label: "Valor da causa", type: "CURRENCY", amount: true },
    ],
    statuses: [{ name: "Inicial", color: C.mute }, { name: "Em andamento", color: C.blue }, { name: "Recurso", color: C.warn }, { name: "Encerrado", color: C.ok, final: true }],
  },
];

/** Pacotes por segmento (chaves de MODULE_TEMPLATES). */
export const SEGMENT_PACKS: { key: string; label: string; modules: string[] }[] = [
  { key: "servicos", label: "Serviços", modules: ["ordens-servico", "chamados", "contratos", "financeiro"] },
  { key: "construcao", label: "Construção e arquitetura", modules: ["projetos", "compras", "estoque", "documentos", "financeiro"] },
  { key: "agro", label: "Agronegócio", modules: ["talhoes", "frota", "estoque", "manutencoes", "financeiro"] },
  { key: "saude", label: "Saúde e clínicas", modules: ["atendimentos", "estoque", "documentos", "financeiro"] },
  { key: "educacao", label: "Educação", modules: ["matriculas", "colaboradores", "chamados", "financeiro"] },
  { key: "juridico", label: "Jurídico", modules: ["processos", "contratos", "documentos", "financeiro"] },
  { key: "varejo", label: "Varejo e comércio", modules: ["estoque", "compras", "colaboradores", "financeiro"] },
  { key: "industria", label: "Indústria", modules: ["manutencoes", "estoque", "compras", "patrimonio", "frota"] },
  { key: "tecnologia", label: "Tecnologia e SaaS", modules: ["projetos", "chamados", "contratos", "financeiro"] },
  { key: "geral", label: "Empresa em geral", modules: ["chamados", "financeiro", "patrimonio", "documentos"] },
];

/** Mapeia o segmento escolhido no cadastro para um pacote. */
export function packForSegment(segment?: string | null) {
  const s = (segment ?? "").toLowerCase();
  const pick = (k: string) => SEGMENT_PACKS.find((p) => p.key === k)!;
  if (/imobili|constru|arquit|engenh/.test(s)) return pick("construcao");
  if (/agro|fazend|pecu/.test(s)) return pick("agro");
  if (/sa[uú]de|cl[ií]nic/.test(s)) return pick("saude");
  if (/educa|escola/.test(s)) return pick("educacao");
  if (/jur[ií]d|advoc/.test(s)) return pick("juridico");
  if (/varejo|com[eé]rcio|loja/.test(s)) return pick("varejo");
  if (/ind[uú]str/.test(s)) return pick("industria");
  if (/software|saas|tecnolog/.test(s)) return pick("tecnologia");
  if (/servi[cç]|consult|ag[eê]ncia|marketing|financeiro|seguro/.test(s)) return pick("servicos");
  return pick("geral");
}

export const FIELD_TYPES: Record<string, string> = {
  TEXT: "Texto curto",
  TEXTAREA: "Texto longo",
  NUMBER: "Número",
  CURRENCY: "Valor (moeda)",
  DATE: "Data",
  SELECT: "Lista de opções",
  MULTISELECT: "Múltipla escolha",
  BOOLEAN: "Sim / Não",
  URL: "Link",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  CONTACT: "Vínculo: contato",
  COMPANY: "Vínculo: empresa",
};
