"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power } from "lucide-react";
import { DeleteFieldButton } from "@/components/delete-field-button";
import type { CustomFieldDefinition } from "@/lib/custom-fields";
import {
  FIELD_SOURCES,
  FIXED_FIELDS,
  FIXED_FIELD_OPERATORS,
  NO_VALUE_OPERATORS,
  OPERATOR_LABELS,
  TAG_OPERATORS,
  describeRule,
  operatorsForFieldType,
  type FieldSource,
  type ScoringOperator,
  type ScoringRule,
  type ScoringTier,
} from "@/lib/scoring";
import {
  createRule,
  deleteRule,
  setRuleActive,
  createTier,
  deleteTier,
  updateTier,
} from "./actions";

type TagLite = { id: string; name: string; color: string };
type FieldOption = { value: string; label: string };

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";

export function ScoringClient({
  rules,
  tiers,
  fieldDefinitions,
  tags,
}: {
  rules: ScoringRule[];
  tiers: ScoringTier[];
  fieldDefinitions: CustomFieldDefinition[];
  tags: TagLite[];
}) {
  const customLabels = useMemo(
    () => Object.fromEntries(fieldDefinitions.map((f) => [f.key, f.label])),
    [fieldDefinitions],
  );

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg-1">Regras de pontuação</h2>
          <span className="text-xs text-fg-3">
            {rules.length} {rules.length === 1 ? "regra" : "regras"}
          </span>
        </div>

        <div className="mb-4 overflow-hidden rounded-lg border border-border-1 bg-oxford-white">
          {rules.length ? (
            <ul className="divide-y divide-border-1">
              {rules.map((rule) => (
                <RuleRow key={rule.id} rule={rule} customLabels={customLabels} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              Nenhuma regra ainda. Crie a primeira abaixo.
            </p>
          )}
        </div>

        <NewRuleForm fieldDefinitions={fieldDefinitions} tags={tags} />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-fg-1">Faixas de qualidade</h2>
        <p className="mb-3 text-xs text-fg-3">
          Cada faixa vale a partir da sua pontuação mínima. Um contato recebe a
          faixa de maior mínimo que ele alcança.
        </p>
        <TiersManager tiers={tiers} />
      </section>
    </div>
  );
}

// -------------------- Regras --------------------

function PointsBadge({ points }: { points: number }) {
  const tone =
    points > 0
      ? "bg-emerald-50 text-emerald-700"
      : points < 0
        ? "bg-rose-50 text-rose-700"
        : "bg-bg-surface-2 text-fg-3";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`}>
      {points > 0 ? `+${points}` : points} pts
    </span>
  );
}

function RuleRow({
  rule,
  customLabels,
}: {
  rule: ScoringRule;
  customLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setRuleActive(rule.id, !rule.is_active);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className={rule.is_active ? "" : "opacity-50"}>
        <p className="text-sm font-medium text-fg-1">{rule.name}</p>
        <p className="text-xs text-fg-3">
          {describeRule(rule, customLabels)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <PointsBadge points={rule.points} />
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          title={rule.is_active ? "Desativar regra" : "Ativar regra"}
          className={`transition-colors disabled:opacity-60 ${
            rule.is_active
              ? "text-emerald-600 hover:text-emerald-700"
              : "text-fg-muted hover:text-fg-2"
          }`}
          aria-label={rule.is_active ? "Desativar regra" : "Ativar regra"}
        >
          <Power size={16} strokeWidth={1.5} />
        </button>
        <DeleteFieldButton
          fieldId={rule.id}
          deleteAction={deleteRule}
          confirmMessage="Excluir esta regra de pontuação?"
        />
      </div>
    </li>
  );
}

function NewRuleForm({
  fieldDefinitions,
  tags,
}: {
  fieldDefinitions: CustomFieldDefinition[];
  tags: TagLite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [fieldSource, setFieldSource] = useState<FieldSource>("fixed");
  const [fieldKey, setFieldKey] = useState<string>(FIXED_FIELDS[0].key);
  const [operator, setOperator] = useState<ScoringOperator>("is_filled");
  const [value, setValue] = useState("");
  const [points, setPoints] = useState("10");

  const selectedDef = useMemo(
    () => fieldDefinitions.find((f) => f.key === fieldKey) ?? null,
    [fieldDefinitions, fieldKey],
  );

  // Operadores disponíveis conforme a fonte / tipo do campo custom.
  const availableOperators: ScoringOperator[] = useMemo(() => {
    if (fieldSource === "tag") return TAG_OPERATORS;
    if (fieldSource === "custom") {
      return selectedDef ? operatorsForFieldType(selectedDef.field_type) : [];
    }
    return FIXED_FIELD_OPERATORS;
  }, [fieldSource, selectedDef]);

  // Garante que o operador selecionado é válido para a fonte/campo atuais.
  const effectiveOperator = availableOperators.includes(operator)
    ? operator
    : (availableOperators[0] ?? "is_filled");

  const fieldOptions = (selectedDef?.options as FieldOption[] | null) ?? [];
  const needsValue =
    fieldSource === "tag" || !NO_VALUE_OPERATORS.includes(effectiveOperator);

  function onSourceChange(next: FieldSource) {
    setFieldSource(next);
    setValue("");
    if (next === "fixed") {
      setFieldKey(FIXED_FIELDS[0].key);
      setOperator("is_filled");
    } else if (next === "custom") {
      const first = fieldDefinitions[0];
      setFieldKey(first?.key ?? "");
      setOperator(
        first ? (operatorsForFieldType(first.field_type)[0] ?? "is_filled") : "is_filled",
      );
    } else {
      setFieldKey("");
      setOperator("has_tag");
    }
  }

  function onFieldChange(key: string) {
    setFieldKey(key);
    setValue("");
    const def = fieldDefinitions.find((f) => f.key === key);
    if (def) setOperator(operatorsForFieldType(def.field_type)[0] ?? "is_filled");
  }

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("field_source", fieldSource);
    fd.set("field_key", fieldSource === "tag" ? "" : fieldKey);
    fd.set("operator", effectiveOperator);
    fd.set("value", needsValue ? value : "");
    fd.set("points", points);

    startTransition(async () => {
      try {
        await createRule(fd);
        setName("");
        setValue("");
        setPoints("10");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar a regra.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-fg-2">Nova regra</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-fg-2">Nome da regra</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Empresa preenchida"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg-2">Fonte</span>
          <select
            value={fieldSource}
            onChange={(e) => onSourceChange(e.target.value as FieldSource)}
            className={inputClass}
          >
            {FIELD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {fieldSource === "fixed" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg-2">Campo</span>
            <select
              value={fieldKey}
              onChange={(e) => onFieldChange(e.target.value)}
              className={inputClass}
            >
              {FIXED_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {fieldSource === "custom" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg-2">Campo</span>
            {fieldDefinitions.length ? (
              <select
                value={fieldKey}
                onChange={(e) => onFieldChange(e.target.value)}
                className={inputClass}
              >
                {fieldDefinitions.map((f) => (
                  <option key={f.id} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-md border border-dashed border-border-1 px-3 py-2 text-xs text-fg-muted">
                Nenhum campo personalizado. Crie em Contatos → Campos.
              </p>
            )}
          </label>
        ) : null}

        {fieldSource === "tag" ? <div className="hidden sm:block" /> : null}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg-2">Condição</span>
          <select
            value={effectiveOperator}
            onChange={(e) => setOperator(e.target.value as ScoringOperator)}
            className={inputClass}
            disabled={!availableOperators.length}
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg-2">Valor</span>
          {!needsValue ? (
            <input disabled placeholder="—" className={`${inputClass} bg-bg-surface-2`} />
          ) : fieldSource === "tag" ? (
            tags.length ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione a tag...</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="nome da tag"
                className={inputClass}
              />
            )
          ) : selectedDef && fieldSource === "custom" && fieldOptions.length ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {fieldOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : selectedDef?.field_type === "boolean" && fieldSource === "custom" ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          ) : (
            <input
              type={
                fieldSource === "custom" && selectedDef?.field_type === "number"
                  ? "number"
                  : fieldSource === "custom" && selectedDef?.field_type === "date"
                    ? "date"
                    : "text"
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="valor de comparação"
              className={inputClass}
            />
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg-2">
            Pontos (use negativo para subtrair)
          </span>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        <Plus size={16} strokeWidth={1.5} />
        {isPending ? "Adicionando..." : "Adicionar regra"}
      </button>
    </div>
  );
}

// -------------------- Faixas (tiers) --------------------

function TiersManager({ tiers }: { tiers: ScoringTier[] }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border-1 bg-oxford-white">
        {tiers.length ? (
          <ul className="divide-y divide-border-1">
            {tiers.map((tier) => (
              <TierRow key={tier.id} tier={tier} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Nenhuma faixa definida.
          </p>
        )}
      </div>

      <form
        action={createTier}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-border-1 bg-oxford-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">Cor</label>
          <input
            name="color"
            type="color"
            defaultValue="#16a34a"
            className="h-9 w-12 rounded-md border border-border-1"
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="mb-1 block text-sm font-medium text-fg-2">Nome da faixa</label>
          <input name="label" required placeholder="ex: Muito quente" className={inputClass} />
        </div>
        <div className="w-32">
          <label className="mb-1 block text-sm font-medium text-fg-2">Pontuação mín.</label>
          <input
            name="min_score"
            type="number"
            defaultValue={0}
            required
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Adicionar faixa
        </button>
      </form>
    </div>
  );
}

function TierRow({ tier }: { tier: ScoringTier }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const updateThisTier = updateTier.bind(null, tier.id);

  if (editing) {
    return (
      <li className="px-4 py-3">
        <form
          action={(fd) =>
            startTransition(async () => {
              await updateThisTier(fd);
              setEditing(false);
              router.refresh();
            })
          }
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label className="mb-1 block text-xs text-fg-3">Cor</label>
            <input
              name="color"
              type="color"
              defaultValue={tier.color}
              className="h-9 w-12 rounded-md border border-border-1"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs text-fg-3">Nome</label>
            <input name="label" required defaultValue={tier.label} className={inputClass} />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-fg-3">Mín.</label>
            <input
              name="min_score"
              type="number"
              defaultValue={tier.min_score}
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-oxford-blue px-3 py-2 text-sm font-medium text-white hover:bg-oxford-blue-600 disabled:opacity-60"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-3 py-2 text-sm text-fg-3 hover:text-fg-1"
          >
            Cancelar
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: tier.color }}
        />
        <span className="text-sm font-medium text-fg-1">{tier.label}</span>
        <span className="text-xs text-fg-3">a partir de {tier.min_score} pts</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-fg-brand hover:underline"
        >
          Editar
        </button>
        <DeleteFieldButton
          fieldId={tier.id}
          deleteAction={deleteTier}
          confirmMessage="Excluir esta faixa?"
        />
      </div>
    </li>
  );
}
