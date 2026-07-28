"use client";

import { Fragment, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ConditionNode, ConditionRule, FlowNode } from "@/lib/automations/flow";
import { NODE_DEFINITIONS, describeNode, nodeDefinition } from "@/lib/automations/node-catalog";
import { resolversFrom, type BuilderCatalogs } from "./builder-types";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-fg-2";

// Profundidade máxima de Se/Senão aninhado: a recursão divide a largura da
// coluna, então mais que 2 níveis não cabe no layout.
const MAX_CONDITION_DEPTH = 2;

// Coluna vertical do fluxograma: conector + botão "+" entre cada nó, nó,
// ramos recursivos abaixo de cada condition. Componente controlado até a raiz.
export function FlowColumn({
  nodes,
  onChange,
  catalogs,
  depth,
  locked,
  isRoot = false,
}: {
  nodes: FlowNode[];
  onChange: (nodes: FlowNode[]) => void;
  catalogs: BuilderCatalogs;
  depth: number;
  locked: boolean;
  isRoot?: boolean;
}) {
  function insertAt(index: number, node: FlowNode) {
    onChange([...nodes.slice(0, index), node, ...nodes.slice(index)]);
  }
  function updateAt(index: number, node: FlowNode) {
    onChange(nodes.map((n, i) => (i === index ? node : n)));
  }
  function removeAt(index: number) {
    onChange(nodes.filter((_, i) => i !== index));
  }

  return (
    <div className="flex w-full flex-col items-center">
      {nodes.map((node, i) => (
        <Fragment key={node.id}>
          <Connector>
            {!locked ? <AddStepButton depth={depth} onAdd={(n) => insertAt(i, n)} /> : null}
          </Connector>
          <NodeCard
            node={node}
            catalogs={catalogs}
            locked={locked}
            onChange={(n) => updateAt(i, n)}
            onRemove={() => removeAt(i)}
          />
          {node.type === "condition" ? (
            <ConditionBranches
              node={node}
              catalogs={catalogs}
              depth={depth}
              locked={locked}
              onChange={(n) => updateAt(i, n)}
            />
          ) : null}
        </Fragment>
      ))}
      <Connector>
        {!locked ? <AddStepButton depth={depth} onAdd={(n) => insertAt(nodes.length, n)} /> : null}
      </Connector>
      {isRoot ? (
        <span className="rounded-full bg-bg-surface-2 px-3 py-1 text-xs text-fg-muted">Fim</span>
      ) : null}
    </div>
  );
}

function Connector({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative flex h-12 w-full items-center justify-center">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-1" />
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}

function AddStepButton({ depth, onAdd }: { depth: number; onAdd: (node: FlowNode) => void }) {
  const [open, setOpen] = useState(false);

  const definitions = NODE_DEFINITIONS.filter(
    (d) => d.type !== "condition" || depth < MAX_CONDITION_DEPTH,
  );
  const groups = [...new Set(definitions.map((d) => d.group))];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Adicionar passo"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border-1 bg-oxford-white p-1 text-fg-3 shadow-sm transition-colors hover:border-border-brand hover:text-fg-brand"
      >
        <Plus size={14} strokeWidth={1.5} />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 z-20 mt-1 max-h-80 w-64 -translate-x-1/2 overflow-y-auto rounded-md border border-border-1 bg-oxford-white p-1 shadow-lg">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                  {group}
                </p>
                {definitions
                  .filter((d) => d.group === group)
                  .map((d) => (
                    <button
                      key={d.type}
                      type="button"
                      onClick={() => {
                        onAdd(d.create());
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-fg-2 hover:bg-bg-surface-2"
                    >
                      <d.icon size={14} strokeWidth={1.5} className="text-fg-3" />
                      {d.label}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function NodeCard({
  node,
  catalogs,
  locked,
  onChange,
  onRemove,
}: {
  node: FlowNode;
  catalogs: BuilderCatalogs;
  locked: boolean;
  onChange: (node: FlowNode) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const def = nodeDefinition(node.type);
  const resolvers = resolversFrom(catalogs);

  return (
    <div className="w-full max-w-md rounded-lg border border-border-1 bg-oxford-white shadow-sm">
      <div className="flex items-center gap-3 p-3">
        <def.icon size={18} strokeWidth={1.5} className="shrink-0 text-oxford-blue" />
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-medium text-fg-1">{def.label}</p>
          <p className="truncate text-xs text-fg-3">{describeNode(node, resolvers)}</p>
        </button>
        {!locked ? (
          <button
            type="button"
            aria-label="Remover passo"
            onClick={() => {
              const message =
                node.type === "condition"
                  ? "Remover esta condição? Os passos dos ramos Sim/Não também serão removidos."
                  : "Remover este passo?";
              if (confirm(message)) onRemove();
            }}
            className="text-fg-muted hover:text-danger"
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
      {editing && !locked ? (
        <div className="border-t border-border-1 p-3">
          <NodeEditor node={node} catalogs={catalogs} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}

function ConditionBranches({
  node,
  catalogs,
  depth,
  locked,
  onChange,
}: {
  node: ConditionNode;
  catalogs: BuilderCatalogs;
  depth: number;
  locked: boolean;
  onChange: (node: ConditionNode) => void;
}) {
  return (
    <div className="w-full">
      <div className="relative h-6">
        <div className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-border-1" />
        <div className="absolute left-1/4 right-1/4 top-3 h-px bg-border-1" />
        <div className="absolute left-1/4 top-3 h-3 w-px bg-border-1" />
        <div className="absolute right-1/4 top-3 h-3 w-px bg-border-1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            Sim
          </span>
          <FlowColumn
            nodes={node.yes}
            onChange={(yes) => onChange({ ...node, yes })}
            catalogs={catalogs}
            depth={depth + 1}
            locked={locked}
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">Não</span>
          <FlowColumn
            nodes={node.no}
            onChange={(no) => onChange({ ...node, no })}
            catalogs={catalogs}
            depth={depth + 1}
            locked={locked}
          />
        </div>
      </div>
      <div className="relative h-6">
        <div className="absolute bottom-3 left-1/4 h-3 w-px bg-border-1" />
        <div className="absolute bottom-3 right-1/4 h-3 w-px bg-border-1" />
        <div className="absolute bottom-3 left-1/4 right-1/4 h-px bg-border-1" />
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-border-1" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editores inline por tipo de nó
// ---------------------------------------------------------------------------

const FIXED_CONTACT_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
];

function NodeEditor({
  node,
  catalogs,
  onChange,
}: {
  node: FlowNode;
  catalogs: BuilderCatalogs;
  onChange: (node: FlowNode) => void;
}) {
  switch (node.type) {
    case "add_tag":
    case "remove_tag":
      return (
        <div>
          <label className={labelClass}>Tag</label>
          <select
            value={node.tag}
            onChange={(e) => onChange({ ...node, tag: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {catalogs.tags.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      );

    case "add_to_list":
    case "remove_from_list":
      return (
        <div>
          <label className={labelClass}>Lista</label>
          <select
            value={node.listId}
            onChange={(e) => onChange({ ...node, listId: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {catalogs.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      );

    case "update_contact_field": {
      const fieldOptions =
        node.fieldSource === "fixed" ? FIXED_CONTACT_FIELDS : catalogs.fields;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo de campo</label>
              <select
                value={node.fieldSource}
                onChange={(e) =>
                  onChange({
                    ...node,
                    fieldSource: e.target.value as "fixed" | "custom",
                    key: "",
                  })
                }
                className={inputClass}
              >
                <option value="fixed">Campo fixo</option>
                <option value="custom">Campo personalizado</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Campo</label>
              <select
                value={node.key}
                onChange={(e) => onChange({ ...node, key: e.target.value })}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {fieldOptions.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Novo valor</label>
            <input
              value={node.value}
              onChange={(e) => onChange({ ...node, value: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      );
    }

    case "create_task":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Título</label>
            <input
              value={node.title}
              onChange={(e) => onChange({ ...node, title: e.target.value })}
              placeholder="Ex: Ligar para {{contato.nome}}"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Descrição (opcional)</label>
            <textarea
              value={node.description}
              onChange={(e) => onChange({ ...node, description: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vencimento (dias a partir de hoje)</label>
              <input
                type="number"
                min={0}
                value={node.dueInDays ?? ""}
                onChange={(e) =>
                  onChange({
                    ...node,
                    dueInDays: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Sem vencimento"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Responsável</label>
              <select
                value={node.assignedTo ?? ""}
                onChange={(e) => onChange({ ...node, assignedTo: e.target.value || null })}
                className={inputClass}
              >
                <option value="">Ninguém</option>
                {catalogs.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );

    case "create_deal": {
      const stages = catalogs.stages.filter((s) => s.pipeline_id === node.pipelineId);
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Título</label>
            <input
              value={node.title}
              onChange={(e) => onChange({ ...node, title: e.target.value })}
              placeholder="Ex: Oportunidade — {{contato.nome}}"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Funil</label>
              <select
                value={node.pipelineId}
                onChange={(e) => onChange({ ...node, pipelineId: e.target.value, stageId: "" })}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {catalogs.pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estágio</label>
              <select
                value={node.stageId}
                onChange={(e) => onChange({ ...node, stageId: e.target.value })}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Valor (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={node.value}
              onChange={(e) => onChange({ ...node, value: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
        </div>
      );
    }

    case "move_deal_stage":
      return (
        <div>
          <label className={labelClass}>Estágio de destino</label>
          <select
            value={node.stageId}
            onChange={(e) => onChange({ ...node, stageId: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {catalogs.pipelines.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {catalogs.stages
                  .filter((s) => s.pipeline_id === p.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-xs text-fg-muted">
            Aplica ao negócio do evento ou, se não houver, ao negócio aberto mais recente do contato.
          </p>
        </div>
      );

    case "set_deal_status":
      return (
        <div>
          <label className={labelClass}>Marcar como</label>
          <select
            value={node.dealStatus}
            onChange={(e) =>
              onChange({ ...node, dealStatus: e.target.value as "won" | "lost" | "open" })
            }
            className={inputClass}
          >
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
            <option value="open">Aberto (reabrir)</option>
          </select>
        </div>
      );

    case "send_email":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Template</label>
            <select
              value={node.templateId}
              onChange={(e) => onChange({ ...node, templateId: e.target.value })}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {catalogs.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Assunto (vazio = assunto do template)</label>
            <input
              value={node.subject}
              onChange={(e) => onChange({ ...node, subject: e.target.value })}
              placeholder="Aceita {{contato.nome}} e outros campos"
              className={inputClass}
            />
          </div>
        </div>
      );

    case "webhook":
      return (
        <div>
          <label className={labelClass}>URL de destino (POST com os dados do contato)</label>
          <input
            value={node.url}
            onChange={(e) => onChange({ ...node, url: e.target.value })}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      );

    case "wait":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Duração</label>
            <input
              type="number"
              min={1}
              value={node.amount}
              onChange={(e) =>
                onChange({ ...node, amount: Math.max(1, Number(e.target.value) || 1) })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Unidade</label>
            <select
              value={node.unit}
              onChange={(e) =>
                onChange({ ...node, unit: e.target.value as "minutes" | "hours" | "days" })
              }
              className={inputClass}
            >
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Dias</option>
            </select>
          </div>
        </div>
      );

    case "condition":
      return <ConditionEditor node={node} catalogs={catalogs} onChange={onChange} />;
  }
}

// ---------------------------------------------------------------------------
// Editor de regras do Se/Senão
// ---------------------------------------------------------------------------

const RULE_SOURCES = [
  { value: "fixed", label: "Campo fixo" },
  { value: "custom", label: "Campo personalizado" },
  { value: "tag", label: "Tag" },
  { value: "score", label: "Score" },
  { value: "list", label: "Lista" },
] as const;

const OPERATOR_LABEL: Record<ConditionRule["operator"], string> = {
  equals: "é igual a",
  not_equals: "é diferente de",
  contains: "contém",
  is_filled: "está preenchido",
  not_filled: "está vazio",
  has_tag: "tem a tag",
  not_has_tag: "não tem a tag",
  gt: "maior que",
  lt: "menor que",
  in_list: "está na lista",
  not_in_list: "não está na lista",
};

const OPERATORS_BY_SOURCE: Record<ConditionRule["source"], ConditionRule["operator"][]> = {
  fixed: ["equals", "not_equals", "contains", "is_filled", "not_filled"],
  custom: ["equals", "not_equals", "contains", "gt", "lt", "is_filled", "not_filled"],
  tag: ["has_tag", "not_has_tag"],
  score: ["gt", "lt", "equals"],
  list: ["in_list", "not_in_list"],
};

const NO_VALUE_OPERATORS = new Set<ConditionRule["operator"]>(["is_filled", "not_filled"]);

function newRule(): ConditionRule {
  return { source: "tag", key: "", operator: "has_tag", value: "" };
}

function ConditionEditor({
  node,
  catalogs,
  onChange,
}: {
  node: ConditionNode;
  catalogs: BuilderCatalogs;
  onChange: (node: ConditionNode) => void;
}) {
  function updateRule(index: number, rule: ConditionRule) {
    onChange({ ...node, rules: node.rules.map((r, i) => (i === index ? rule : r)) });
  }
  function removeRule(index: number) {
    onChange({ ...node, rules: node.rules.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>O contato avança pelo ramo &quot;Sim&quot; quando</label>
        <select
          value={node.match}
          onChange={(e) => onChange({ ...node, match: e.target.value as "all" | "any" })}
          className={inputClass}
        >
          <option value="all">Todas as regras forem verdadeiras</option>
          <option value="any">Qualquer regra for verdadeira</option>
        </select>
      </div>

      {node.rules.map((rule, i) => (
        <RuleRow
          key={i}
          rule={rule}
          catalogs={catalogs}
          onChange={(r) => updateRule(i, r)}
          onRemove={() => removeRule(i)}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange({ ...node, rules: [...node.rules, newRule()] })}
        className="flex items-center gap-1.5 rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2"
      >
        <Plus size={13} strokeWidth={1.5} />
        Adicionar regra
      </button>
    </div>
  );
}

function RuleRow({
  rule,
  catalogs,
  onChange,
  onRemove,
}: {
  rule: ConditionRule;
  catalogs: BuilderCatalogs;
  onChange: (rule: ConditionRule) => void;
  onRemove: () => void;
}) {
  const operators = OPERATORS_BY_SOURCE[rule.source];
  const effectiveOperator = operators.includes(rule.operator) ? rule.operator : operators[0];
  const needsKey = rule.source === "fixed" || rule.source === "custom";
  const needsValue = !NO_VALUE_OPERATORS.has(effectiveOperator);
  const keyOptions = rule.source === "fixed" ? FIXED_CONTACT_FIELDS : catalogs.fields;

  return (
    <div className="rounded-md border border-border-1 p-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={rule.source}
          aria-label="Origem da regra"
          onChange={(e) => {
            const source = e.target.value as ConditionRule["source"];
            onChange({ source, key: "", operator: OPERATORS_BY_SOURCE[source][0], value: "" });
          }}
          className={inputClass}
        >
          {RULE_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {needsKey ? (
          <select
            value={rule.key}
            aria-label="Campo da regra"
            onChange={(e) => onChange({ ...rule, key: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione o campo...</option>
            {keyOptions.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

        <select
          value={effectiveOperator}
          aria-label="Operador da regra"
          onChange={(e) =>
            onChange({ ...rule, operator: e.target.value as ConditionRule["operator"] })
          }
          className={inputClass}
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABEL[op]}
            </option>
          ))}
        </select>

        {needsValue ? (
          rule.source === "tag" ? (
            <select
              value={rule.value}
              aria-label="Tag da regra"
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              className={inputClass}
            >
              <option value="">Selecione a tag...</option>
              {catalogs.tags.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : rule.source === "list" ? (
            <select
              value={rule.value}
              aria-label="Lista da regra"
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              className={inputClass}
            >
              <option value="">Selecione a lista...</option>
              {catalogs.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={rule.value}
              aria-label="Valor da regra"
              type={rule.source === "score" ? "number" : "text"}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="Valor"
              className={inputClass}
            />
          )
        ) : (
          <div />
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-xs text-fg-muted hover:text-danger"
      >
        Remover regra
      </button>
    </div>
  );
}
