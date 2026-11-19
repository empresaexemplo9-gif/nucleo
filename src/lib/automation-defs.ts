/** Gatilhos e ações das automações (compartilhado entre servidor e telas). */
export type AutomationTrigger =
  | "DEAL_CREATED"
  | "DEAL_STAGE_ENTERED"
  | "DEAL_WON"
  | "DEAL_LOST"
  | "DEAL_STALE"
  | "PROPOSAL_PENDING"
  | "ACTIVITY_REMINDER"
  | "RECORD_DUE"
  | "CONTACT_BIRTHDAY"
  | "RECORD_CREATED"
  | "RECORD_STATUS";

export const TRIGGERS: Record<AutomationTrigger, { label: string; group: "Eventos do funil" | "Módulos de controle" | "Lembretes e follow-ups"; deal: boolean; scheduled: boolean }> = {
  DEAL_CREATED: { label: "Negócio criado", group: "Eventos do funil", deal: true, scheduled: false },
  DEAL_STAGE_ENTERED: { label: "Negócio entrou na etapa…", group: "Eventos do funil", deal: true, scheduled: false },
  DEAL_WON: { label: "Negócio ganho", group: "Eventos do funil", deal: true, scheduled: false },
  DEAL_LOST: { label: "Negócio perdido", group: "Eventos do funil", deal: true, scheduled: false },
  DEAL_STALE: { label: "Negócio parado há X dias", group: "Lembretes e follow-ups", deal: true, scheduled: true },
  PROPOSAL_PENDING: { label: "Proposta enviada sem resposta há X dias", group: "Lembretes e follow-ups", deal: false, scheduled: true },
  ACTIVITY_REMINDER: { label: "Compromisso com o cliente se aproximando", group: "Lembretes e follow-ups", deal: false, scheduled: true },
  RECORD_DUE: { label: "Vencimento ou horário marcado de um registro", group: "Lembretes e follow-ups", deal: false, scheduled: true },
  CONTACT_BIRTHDAY: { label: "Aniversário do contato", group: "Lembretes e follow-ups", deal: false, scheduled: true },
  RECORD_CREATED: { label: "Registro criado em um módulo", group: "Módulos de controle", deal: false, scheduled: false },
  RECORD_STATUS: { label: "Registro de um módulo entrou no status…", group: "Módulos de controle", deal: false, scheduled: false },
};

export const ACTIONS = {
  SEND_WHATSAPP: "Enviar WhatsApp ao cliente",
  NOTIFY_TEAM: "Notificar a equipe",
  CREATE_ACTIVITY: "Criar atividade",
  ADD_NOTE: "Adicionar nota",
  ADD_TAG: "Adicionar etiqueta",
  SET_OWNER: "Definir responsável",
  SET_LIFECYCLE: "Alterar ciclo de vida do contato",
} as const;
export type AutomationAction = keyof typeof ACTIONS;

/** Ações que só fazem sentido quando o gatilho parte de um negócio. */
export const DEAL_ONLY_ACTIONS: AutomationAction[] = ["ADD_TAG", "SET_OWNER", "SET_LIFECYCLE"];

export const actionsFor = (trigger: string) =>
  (Object.keys(ACTIONS) as AutomationAction[]).filter((a) => TRIGGERS[trigger as AutomationTrigger]?.deal || !DEAL_ONLY_ACTIONS.includes(a));

/** Variáveis aceitas nas mensagens. */
export const VARIABLES: Record<string, string> = {
  nome: "primeiro nome do cliente",
  nome_completo: "nome completo do cliente",
  empresa: "nome da sua empresa",
  responsavel: "quem atende o cliente",
  negocio: "título do negócio",
  valor: "valor do negócio, proposta ou registro",
  titulo: "título do compromisso, proposta ou registro",
  data: "data do compromisso ou vencimento",
  hora: "hora do compromisso",
  link: "link público da proposta",
  codigo: "código do registro (ex.: OS-0012)",
  status: "status atual do registro",
};

export type AutomationConfig = {
  // gatilhos
  days?: number;
  hoursBefore?: number;
  activityType?: string;
  reminderType?: string;
  moduleKey?: string;
  statusName?: string;
  when?: "BEFORE" | "ON" | "AFTER";
  /** RECORD_DUE: conta em dias (vencimentos) ou em horas (horários marcados) */
  dueUnit?: "DAY" | "HOUR";
  // ações
  title?: string;
  daysOffset?: number;
  tag?: string;
  ownerId?: string;
  note?: string;
  lifecycle?: string;
  message?: string;
  delayValue?: number;
  delayUnit?: "MIN" | "HOUR" | "DAY";
  stopOnReply?: boolean;
  whileInStage?: boolean;
  templateName?: string;
  templateLang?: string;
  templateParams?: string;
  notifyTo?: "OWNER" | "MANAGERS" | "BOTH";
};

export const render = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k]! : m));
