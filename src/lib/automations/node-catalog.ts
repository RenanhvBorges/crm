import {
  Briefcase,
  CircleCheck,
  Flag,
  ListMinus,
  ListPlus,
  Mail,
  MoveRight,
  PenLine,
  Split,
  Tag,
  Target,
  Timer,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { newNodeId, type FlowNode, type FlowNodeType } from "./flow";

// Catálogo dos passos disponíveis no builder (client-safe): rótulo, ícone,
// agrupamento no popover e fábrica com defaults. O resumo (describeNode) usa
// os catálogos de nomes carregados pelo RSC.

export type NodeDefinition = {
  type: FlowNodeType;
  label: string;
  group: "Contato" | "Vendas e tarefas" | "Mensagens" | "Anúncios" | "Fluxo";
  icon: LucideIcon;
  create: () => FlowNode;
};

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: "add_tag",
    label: "Adicionar tag",
    group: "Contato",
    icon: Tag,
    create: () => ({ id: newNodeId(), type: "add_tag", tag: "" }),
  },
  {
    type: "remove_tag",
    label: "Remover tag",
    group: "Contato",
    icon: Tag,
    create: () => ({ id: newNodeId(), type: "remove_tag", tag: "" }),
  },
  {
    type: "add_to_list",
    label: "Adicionar à lista",
    group: "Contato",
    icon: ListPlus,
    create: () => ({ id: newNodeId(), type: "add_to_list", listId: "" }),
  },
  {
    type: "remove_from_list",
    label: "Remover da lista",
    group: "Contato",
    icon: ListMinus,
    create: () => ({ id: newNodeId(), type: "remove_from_list", listId: "" }),
  },
  {
    type: "update_contact_field",
    label: "Atualizar campo do contato",
    group: "Contato",
    icon: PenLine,
    create: () => ({
      id: newNodeId(),
      type: "update_contact_field",
      fieldSource: "fixed",
      key: "",
      value: "",
    }),
  },
  {
    type: "create_task",
    label: "Criar tarefa",
    group: "Vendas e tarefas",
    icon: CircleCheck,
    create: () => ({
      id: newNodeId(),
      type: "create_task",
      title: "",
      description: "",
      dueInDays: null,
      assignedTo: null,
    }),
  },
  {
    type: "create_deal",
    label: "Criar negócio",
    group: "Vendas e tarefas",
    icon: Briefcase,
    create: () => ({
      id: newNodeId(),
      type: "create_deal",
      title: "",
      pipelineId: "",
      stageId: "",
      value: 0,
    }),
  },
  {
    type: "move_deal_stage",
    label: "Mover negócio de estágio",
    group: "Vendas e tarefas",
    icon: MoveRight,
    create: () => ({ id: newNodeId(), type: "move_deal_stage", stageId: "" }),
  },
  {
    type: "set_deal_status",
    label: "Marcar negócio (ganho/perdido)",
    group: "Vendas e tarefas",
    icon: Flag,
    create: () => ({ id: newNodeId(), type: "set_deal_status", dealStatus: "won" }),
  },
  {
    type: "send_email",
    label: "Enviar e-mail",
    group: "Mensagens",
    icon: Mail,
    create: () => ({ id: newNodeId(), type: "send_email", templateId: "", subject: "" }),
  },
  {
    type: "webhook",
    label: "Chamar webhook (HTTP)",
    group: "Mensagens",
    icon: Webhook,
    create: () => ({ id: newNodeId(), type: "webhook", url: "" }),
  },
  {
    type: "send_ad_conversion",
    label: "Enviar conversão offline",
    group: "Anúncios",
    icon: Target,
    create: () => ({ id: newNodeId(), type: "send_ad_conversion", conversionId: "" }),
  },
  {
    type: "wait",
    label: "Esperar",
    group: "Fluxo",
    icon: Timer,
    create: () => ({ id: newNodeId(), type: "wait", amount: 1, unit: "days" }),
  },
  {
    type: "condition",
    label: "Se / Senão",
    group: "Fluxo",
    icon: Split,
    create: () => ({
      id: newNodeId(),
      type: "condition",
      match: "all",
      rules: [],
      yes: [],
      no: [],
    }),
  },
];

export function nodeDefinition(type: FlowNodeType): NodeDefinition {
  return NODE_DEFINITIONS.find((d) => d.type === type)!;
}

export type NameResolvers = {
  list?: (id: string) => string | undefined;
  stage?: (id: string) => string | undefined;
  pipeline?: (id: string) => string | undefined;
  template?: (id: string) => string | undefined;
  profile?: (id: string) => string | undefined;
  field?: (key: string) => string | undefined;
  adConversion?: (id: string) => string | undefined;
};

const WAIT_UNIT_LABEL: Record<string, [string, string]> = {
  minutes: ["minuto", "minutos"],
  hours: ["hora", "horas"],
  days: ["dia", "dias"],
};

const FIXED_FIELD_LABEL: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  company: "Empresa",
};

export function describeNode(node: FlowNode, resolve?: NameResolvers): string {
  switch (node.type) {
    case "add_tag":
      return node.tag ? `Adicionar tag "${node.tag}"` : "Selecione a tag";
    case "remove_tag":
      return node.tag ? `Remover tag "${node.tag}"` : "Selecione a tag";
    case "add_to_list":
      return node.listId
        ? `Adicionar à lista ${resolve?.list?.(node.listId) ?? "selecionada"}`
        : "Selecione a lista";
    case "remove_from_list":
      return node.listId
        ? `Remover da lista ${resolve?.list?.(node.listId) ?? "selecionada"}`
        : "Selecione a lista";
    case "update_contact_field": {
      if (!node.key) return "Selecione o campo";
      const label =
        node.fieldSource === "fixed"
          ? (FIXED_FIELD_LABEL[node.key] ?? node.key)
          : (resolve?.field?.(node.key) ?? node.key);
      return `Atualizar ${label} para "${node.value}"`;
    }
    case "create_task":
      return node.title ? `Criar tarefa "${node.title}"` : "Defina o título da tarefa";
    case "create_deal":
      return node.title ? `Criar negócio "${node.title}"` : "Defina o título do negócio";
    case "move_deal_stage":
      return node.stageId
        ? `Mover para o estágio ${resolve?.stage?.(node.stageId) ?? "selecionado"}`
        : "Selecione o estágio";
    case "set_deal_status":
      return node.dealStatus === "won"
        ? "Marcar negócio como ganho"
        : node.dealStatus === "lost"
          ? "Marcar negócio como perdido"
          : "Reabrir negócio";
    case "send_email":
      return node.templateId
        ? `Enviar template ${resolve?.template?.(node.templateId) ?? "selecionado"}`
        : "Selecione o template";
    case "webhook":
      return node.url ? `POST para ${node.url}` : "Informe a URL";
    case "send_ad_conversion":
      return node.conversionId
        ? `Enviar conversão ${resolve?.adConversion?.(node.conversionId) ?? "selecionada"}`
        : "Selecione a conversão";
    case "wait": {
      const [singular, plural] = WAIT_UNIT_LABEL[node.unit] ?? ["", ""];
      return `Esperar ${node.amount} ${node.amount === 1 ? singular : plural}`;
    }
    case "condition":
      return node.rules.length
        ? `${node.rules.length} regra${node.rules.length === 1 ? "" : "s"} (${node.match === "all" ? "todas" : "qualquer uma"})`
        : "Adicione regras à condição";
  }
}
