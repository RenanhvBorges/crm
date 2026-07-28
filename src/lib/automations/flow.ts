import { z } from "zod";

// Schema do fluxo de automação persistido em automations.flow (jsonb).
// O schema é leniente (referências vazias são aceitas) para permitir salvar
// rascunhos incompletos; a completude é exigida por validateFlow na ativação.

export const conditionRuleSchema = z.object({
  source: z.enum(["fixed", "custom", "tag", "score", "list"]),
  key: z.string().default(""),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "is_filled",
    "not_filled",
    "has_tag",
    "not_has_tag",
    "gt",
    "lt",
    "in_list",
    "not_in_list",
  ]),
  value: z.string().default(""),
});

const addTagNode = z.object({ id: z.string(), type: z.literal("add_tag"), tag: z.string() });
const removeTagNode = z.object({ id: z.string(), type: z.literal("remove_tag"), tag: z.string() });
const addToListNode = z.object({ id: z.string(), type: z.literal("add_to_list"), listId: z.string() });
const removeFromListNode = z.object({
  id: z.string(),
  type: z.literal("remove_from_list"),
  listId: z.string(),
});
const createTaskNode = z.object({
  id: z.string(),
  type: z.literal("create_task"),
  title: z.string(),
  description: z.string().default(""),
  dueInDays: z.number().int().min(0).nullable().default(null),
  assignedTo: z.string().nullable().default(null),
});
const createDealNode = z.object({
  id: z.string(),
  type: z.literal("create_deal"),
  title: z.string(),
  pipelineId: z.string(),
  stageId: z.string(),
  value: z.number().min(0).default(0),
});
const moveDealStageNode = z.object({
  id: z.string(),
  type: z.literal("move_deal_stage"),
  stageId: z.string(),
});
const setDealStatusNode = z.object({
  id: z.string(),
  type: z.literal("set_deal_status"),
  dealStatus: z.enum(["won", "lost", "open"]),
});
const updateContactFieldNode = z.object({
  id: z.string(),
  type: z.literal("update_contact_field"),
  fieldSource: z.enum(["fixed", "custom"]),
  key: z.string(),
  value: z.string(),
});
const sendEmailNode = z.object({
  id: z.string(),
  type: z.literal("send_email"),
  templateId: z.string(),
  subject: z.string().default(""),
});
const webhookNode = z.object({ id: z.string(), type: z.literal("webhook"), url: z.string() });
const waitNode = z.object({
  id: z.string(),
  type: z.literal("wait"),
  amount: z.number().int().min(1),
  unit: z.enum(["minutes", "hours", "days"]),
});

export type ConditionRule = z.infer<typeof conditionRuleSchema>;

type ActionNode =
  | z.infer<typeof addTagNode>
  | z.infer<typeof removeTagNode>
  | z.infer<typeof addToListNode>
  | z.infer<typeof removeFromListNode>
  | z.infer<typeof createTaskNode>
  | z.infer<typeof createDealNode>
  | z.infer<typeof moveDealStageNode>
  | z.infer<typeof setDealStatusNode>
  | z.infer<typeof updateContactFieldNode>
  | z.infer<typeof sendEmailNode>
  | z.infer<typeof webhookNode>;

export type WaitNode = z.infer<typeof waitNode>;

export type ConditionNode = {
  id: string;
  type: "condition";
  match: "all" | "any";
  rules: ConditionRule[];
  yes: FlowNode[];
  no: FlowNode[];
};

export type FlowNode = ActionNode | WaitNode | ConditionNode;
export type FlowNodeType = FlowNode["type"];

const conditionNode: z.ZodType<ConditionNode> = z.object({
  id: z.string(),
  type: z.literal("condition"),
  match: z.enum(["all", "any"]),
  rules: z.array(conditionRuleSchema),
  yes: z.array(z.lazy(() => flowNodeSchema)),
  no: z.array(z.lazy(() => flowNodeSchema)),
}) as z.ZodType<ConditionNode>;

export const flowNodeSchema: z.ZodType<FlowNode> = z.lazy(
  () =>
    z.union([
      addTagNode,
      removeTagNode,
      addToListNode,
      removeFromListNode,
      createTaskNode,
      createDealNode,
      moveDealStageNode,
      setDealStatusNode,
      updateContactFieldNode,
      sendEmailNode,
      webhookNode,
      waitNode,
      conditionNode,
    ]) as unknown as z.ZodType<FlowNode>,
);

export const flowSchema = z.object({ nodes: z.array(flowNodeSchema) });

export type Flow = { nodes: FlowNode[] };

export const EMPTY_FLOW: Flow = { nodes: [] };

// Aceita o jsonb persistido (formato desconhecido em tempo de compilação) e
// devolve um fluxo válido, ou vazio se estiver corrompido.
export function parseFlow(raw: unknown): Flow {
  const result = flowSchema.safeParse(raw);
  return result.success ? result.data : EMPTY_FLOW;
}

export function newNodeId(): string {
  return crypto.randomUUID();
}

export function firstNode(flow: Flow): FlowNode | null {
  return flow.nodes[0] ?? null;
}

export function findNode(flow: Flow, nodeId: string): FlowNode | null {
  return findInList(flow.nodes, nodeId);
}

function findInList(nodes: FlowNode[], nodeId: string): FlowNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.type === "condition") {
      const found = findInList(node.yes, nodeId) ?? findInList(node.no, nodeId);
      if (found) return found;
    }
  }
  return null;
}

// Sucessor de um nó na travessia do fluxo: o irmão seguinte no array que o
// contém, ou — para o último nó de um ramo — o sucessor do condition pai
// (os ramos Sim/Não reconvergem). null = fim do fluxo.
export function nextNode(flow: Flow, nodeId: string): FlowNode | null {
  return searchNext(flow.nodes, nodeId, null).next;
}

function searchNext(
  nodes: FlowNode[],
  targetId: string,
  fallback: FlowNode | null,
): { found: boolean; next: FlowNode | null } {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const after = nodes[i + 1] ?? fallback;
    if (node.id === targetId) return { found: true, next: after };
    if (node.type === "condition") {
      const inYes = searchNext(node.yes, targetId, after);
      if (inYes.found) return inYes;
      const inNo = searchNext(node.no, targetId, after);
      if (inNo.found) return inNo;
    }
  }
  return { found: false, next: null };
}

// Primeiro nó do ramo escolhido de um condition; ramo vazio cai direto no
// sucessor do próprio condition (reconvergência).
export function branchEntry(condition: ConditionNode, result: boolean, flow: Flow): FlowNode | null {
  const branch = result ? condition.yes : condition.no;
  return branch[0] ?? nextNode(flow, condition.id);
}

export function countNodes(nodes: FlowNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node.type === "condition") total += countNodes(node.yes) + countNodes(node.no);
  }
  return total;
}

const NO_VALUE_RULE_OPERATORS = new Set(["is_filled", "not_filled"]);

// Erros que impedem a ativação da automação (o rascunho pode ser salvo com eles).
export function validateFlow(flow: Flow): string[] {
  const errors: string[] = [];
  validateList(flow.nodes, errors);
  if (flow.nodes.length === 0) errors.push("Adicione ao menos um passo ao fluxo.");
  return errors;
}

function validateList(nodes: FlowNode[], errors: string[]) {
  for (const node of nodes) {
    switch (node.type) {
      case "add_tag":
      case "remove_tag":
        if (!node.tag.trim()) errors.push("Há um passo de tag sem tag selecionada.");
        break;
      case "add_to_list":
      case "remove_from_list":
        if (!node.listId) errors.push("Há um passo de lista sem lista selecionada.");
        break;
      case "create_task":
        if (!node.title.trim()) errors.push("Há um passo de tarefa sem título.");
        break;
      case "create_deal":
        if (!node.title.trim() || !node.pipelineId || !node.stageId)
          errors.push("Há um passo de criar negócio sem título, funil ou estágio.");
        break;
      case "move_deal_stage":
        if (!node.stageId) errors.push("Há um passo de mover negócio sem estágio selecionado.");
        break;
      case "update_contact_field":
        if (!node.key) errors.push("Há um passo de atualizar campo sem campo selecionado.");
        break;
      case "send_email":
        if (!node.templateId) errors.push("Há um passo de e-mail sem template selecionado.");
        break;
      case "webhook":
        try {
          new URL(node.url);
        } catch {
          errors.push("Há um passo de webhook com URL inválida.");
        }
        break;
      case "set_deal_status":
      case "wait":
        break;
      case "condition":
        if (node.rules.length === 0) {
          errors.push("Há uma condição sem regras.");
        }
        for (const rule of node.rules) {
          if ((rule.source === "fixed" || rule.source === "custom") && !rule.key)
            errors.push("Há uma regra de condição sem campo selecionado.");
          if (!NO_VALUE_RULE_OPERATORS.has(rule.operator) && !rule.value.trim())
            errors.push("Há uma regra de condição sem valor.");
        }
        validateList(node.yes, errors);
        validateList(node.no, errors);
        break;
    }
  }
}
