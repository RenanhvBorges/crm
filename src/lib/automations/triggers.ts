// Catálogo de gatilhos de automação e matching contra automation_events.
// Sem imports de UI aqui: este módulo é usado tanto pelo builder quanto pelo
// motor (server). Ícones ficam nos componentes.

export type TriggerType =
  | "contact_created"
  | "tag_added"
  | "tag_removed"
  | "score_changed"
  | "list_joined"
  | "list_left"
  | "deal_created"
  | "deal_stage_changed"
  | "deal_won"
  | "deal_lost"
  | "task_created"
  | "task_completed"
  | "email_opened"
  | "email_clicked"
  | "meta_lead_received"
  | "api_enroll";

// Que tipo de campo de configuração o gatilho exibe no formulário.
export type TriggerConfigKind =
  | "none"
  | "tag"
  | "list"
  | "score"
  | "pipeline"
  | "pipeline_stage"
  | "campaign"
  | "meta_form";

export type TriggerDefinition = {
  value: TriggerType;
  label: string;
  description: string;
  configKind: TriggerConfigKind;
};

export const TRIGGER_TYPES: TriggerDefinition[] = [
  {
    value: "contact_created",
    label: "Contato criado",
    description: "Dispara quando um contato novo é criado (UI, API ou importação).",
    configKind: "none",
  },
  {
    value: "tag_added",
    label: "Tag adicionada",
    description: "Dispara quando uma tag é adicionada a um contato.",
    configKind: "tag",
  },
  {
    value: "tag_removed",
    label: "Tag removida",
    description: "Dispara quando uma tag é removida de um contato.",
    configKind: "tag",
  },
  {
    value: "score_changed",
    label: "Score mudou",
    description: "Dispara quando o lead score do contato muda ou cruza um limiar.",
    configKind: "score",
  },
  {
    value: "list_joined",
    label: "Entrou em lista",
    description: "Dispara quando um contato entra numa lista.",
    configKind: "list",
  },
  {
    value: "list_left",
    label: "Saiu de lista",
    description: "Dispara quando um contato sai de uma lista.",
    configKind: "list",
  },
  {
    value: "deal_created",
    label: "Negócio criado",
    description: "Dispara quando um negócio é criado.",
    configKind: "pipeline",
  },
  {
    value: "deal_stage_changed",
    label: "Negócio mudou de estágio",
    description: "Dispara quando um negócio entra num estágio do funil.",
    configKind: "pipeline_stage",
  },
  {
    value: "deal_won",
    label: "Negócio ganho",
    description: "Dispara quando um negócio é marcado como ganho.",
    configKind: "none",
  },
  {
    value: "deal_lost",
    label: "Negócio perdido",
    description: "Dispara quando um negócio é marcado como perdido.",
    configKind: "none",
  },
  {
    value: "task_created",
    label: "Tarefa criada",
    description: "Dispara quando uma tarefa vinculada a um contato é criada.",
    configKind: "none",
  },
  {
    value: "task_completed",
    label: "Tarefa concluída",
    description: "Dispara quando uma tarefa vinculada a um contato é concluída.",
    configKind: "none",
  },
  {
    value: "email_opened",
    label: "E-mail aberto",
    description: "Dispara na primeira abertura de um e-mail pelo contato.",
    configKind: "campaign",
  },
  {
    value: "email_clicked",
    label: "E-mail clicado",
    description: "Dispara no primeiro clique num link de e-mail pelo contato.",
    configKind: "campaign",
  },
  {
    value: "meta_lead_received",
    label: "Lead do Meta Ads recebido",
    description:
      "Dispara quando um lead de formulário instantâneo da Meta entra no CRM (contato criado ou atualizado).",
    configKind: "meta_form",
  },
  {
    value: "api_enroll",
    label: "Inscrição via API",
    description: "Não dispara sozinho: contatos entram via chamada de API (ex: n8n).",
    configKind: "none",
  },
];

export function triggerDefinition(type: string): TriggerDefinition | null {
  return TRIGGER_TYPES.find((t) => t.value === type) ?? null;
}

// Catálogo dos event_types gravados em automation_events — usado pela tela de
// webhooks de saída e pela documentação da API.
export const EVENT_TYPES: { value: string; label: string }[] = [
  { value: "contact.created", label: "Contato criado" },
  { value: "contact.tag_added", label: "Tag adicionada ao contato" },
  { value: "contact.tag_removed", label: "Tag removida do contato" },
  { value: "contact.score_changed", label: "Score do contato mudou" },
  { value: "contact.list_joined", label: "Contato entrou em lista" },
  { value: "contact.list_left", label: "Contato saiu de lista" },
  { value: "deal.created", label: "Negócio criado" },
  { value: "deal.stage_changed", label: "Negócio mudou de estágio" },
  { value: "deal.won", label: "Negócio ganho" },
  { value: "deal.lost", label: "Negócio perdido" },
  { value: "task.created", label: "Tarefa criada" },
  { value: "task.completed", label: "Tarefa concluída" },
  { value: "email.opened", label: "E-mail aberto" },
  { value: "email.clicked", label: "E-mail clicado" },
  { value: "meta.lead_received", label: "Lead do Meta Ads recebido" },
];

export type TriggerConfig = {
  tag?: string;
  listId?: string;
  pipelineId?: string;
  stageId?: string;
  campaignId?: string;
  formId?: string;
  mode?: "any" | "crosses_above" | "crosses_below";
  value?: number;
};

export function parseTriggerConfig(raw: unknown): TriggerConfig {
  if (typeof raw !== "object" || raw === null) return {};
  return raw as TriggerConfig;
}

const EVENT_BY_TRIGGER: Record<TriggerType, string | null> = {
  contact_created: "contact.created",
  tag_added: "contact.tag_added",
  tag_removed: "contact.tag_removed",
  score_changed: "contact.score_changed",
  list_joined: "contact.list_joined",
  list_left: "contact.list_left",
  deal_created: "deal.created",
  deal_stage_changed: "deal.stage_changed",
  deal_won: "deal.won",
  deal_lost: "deal.lost",
  task_created: "task.created",
  task_completed: "task.completed",
  email_opened: "email.opened",
  email_clicked: "email.clicked",
  meta_lead_received: "meta.lead_received",
  api_enroll: null,
};

type EventPayload = Record<string, unknown>;

export function triggerMatches(
  automation: { trigger_type: string; trigger_config: unknown },
  event: { event_type: string; payload: unknown },
): boolean {
  const type = automation.trigger_type as TriggerType;
  if (EVENT_BY_TRIGGER[type] !== event.event_type) return false;

  const config = parseTriggerConfig(automation.trigger_config);
  const payload = (typeof event.payload === "object" && event.payload !== null
    ? event.payload
    : {}) as EventPayload;

  switch (type) {
    case "tag_added":
    case "tag_removed":
      return !config.tag || config.tag === payload.tag;
    case "list_joined":
    case "list_left":
      return !config.listId || config.listId === payload.list_id;
    case "score_changed": {
      if (!config.mode || config.mode === "any") return true;
      const threshold = config.value ?? 0;
      const oldScore = typeof payload.old_score === "number" ? payload.old_score : 0;
      const newScore = typeof payload.new_score === "number" ? payload.new_score : 0;
      if (config.mode === "crosses_above") return oldScore < threshold && newScore >= threshold;
      return oldScore >= threshold && newScore < threshold;
    }
    case "deal_created": {
      const deal = (payload.deal ?? {}) as EventPayload;
      return !config.pipelineId || config.pipelineId === deal.pipeline_id;
    }
    case "deal_stage_changed": {
      if (config.pipelineId && config.pipelineId !== payload.pipeline_id) return false;
      return !config.stageId || config.stageId === payload.new_stage_id;
    }
    case "email_opened":
    case "email_clicked":
      return !config.campaignId || config.campaignId === payload.campaign_id;
    case "meta_lead_received":
      return !config.formId || config.formId === payload.form_id;
    default:
      return true;
  }
}

// Resumo textual do gatilho para listagens; os resolvers são opcionais e
// devolvem o nome legível de um id (lista, estágio, campanha).
export function describeTrigger(
  triggerType: string,
  triggerConfig: unknown,
  resolve?: {
    list?: (id: string) => string | undefined;
    stage?: (id: string) => string | undefined;
    pipeline?: (id: string) => string | undefined;
    campaign?: (id: string) => string | undefined;
    metaForm?: (id: string) => string | undefined;
  },
): string {
  const def = triggerDefinition(triggerType);
  if (!def) return triggerType;
  const config = parseTriggerConfig(triggerConfig);

  switch (def.configKind) {
    case "tag":
      return config.tag ? `${def.label}: ${config.tag}` : `${def.label} (qualquer tag)`;
    case "list": {
      if (!config.listId) return `${def.label} (qualquer lista)`;
      const name = resolve?.list?.(config.listId);
      return `${def.label}: ${name ?? "lista selecionada"}`;
    }
    case "score": {
      if (!config.mode || config.mode === "any") return "Score mudou (qualquer mudança)";
      const direction = config.mode === "crosses_above" ? "subiu para" : "caiu abaixo de";
      return `Score ${direction} ${config.value ?? 0}`;
    }
    case "pipeline": {
      if (!config.pipelineId) return `${def.label} (qualquer funil)`;
      const name = resolve?.pipeline?.(config.pipelineId);
      return `${def.label} no funil ${name ?? "selecionado"}`;
    }
    case "pipeline_stage": {
      if (!config.stageId) return `${def.label} (qualquer estágio)`;
      const name = resolve?.stage?.(config.stageId);
      return `Negócio entrou no estágio ${name ?? "selecionado"}`;
    }
    case "campaign": {
      if (!config.campaignId) return `${def.label} (qualquer campanha)`;
      const name = resolve?.campaign?.(config.campaignId);
      return `${def.label} na campanha ${name ?? "selecionada"}`;
    }
    case "meta_form": {
      if (!config.formId) return `${def.label} (qualquer formulário)`;
      const name = resolve?.metaForm?.(config.formId);
      return `${def.label} no formulário ${name ?? "selecionado"}`;
    }
    default:
      return def.label;
  }
}
