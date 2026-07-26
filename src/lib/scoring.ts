import type { Tables } from "@/lib/supabase/database.types";

export type ScoringRule = Tables<"scoring_rules">;
export type ScoringTier = Tables<"scoring_tiers">;

export type FieldSource = "fixed" | "custom" | "tag";
export type ScoringOperator =
  | "is_filled"
  | "is_empty"
  | "equals"
  | "not_equals"
  | "contains"
  | "gt"
  | "lt"
  | "has_tag"
  | "not_has_tag";

export const FIELD_SOURCES: { value: FieldSource; label: string }[] = [
  { value: "fixed", label: "Campo fixo" },
  { value: "custom", label: "Campo personalizado" },
  { value: "tag", label: "Tag" },
];

// Campos fixos do contato que podem ser usados nas regras.
export const FIXED_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
] as const;

export const OPERATOR_LABELS: Record<ScoringOperator, string> = {
  is_filled: "está preenchido",
  is_empty: "está vazio",
  equals: "é igual a",
  not_equals: "é diferente de",
  contains: "contém",
  gt: "maior que",
  lt: "menor que",
  has_tag: "tem a tag",
  not_has_tag: "não tem a tag",
};

// Operadores que não pedem um valor de comparação.
export const NO_VALUE_OPERATORS: ScoringOperator[] = ["is_filled", "is_empty"];

export const TAG_OPERATORS: ScoringOperator[] = ["has_tag", "not_has_tag"];

// Operadores disponíveis para um campo custom, conforme o tipo do campo.
export function operatorsForFieldType(fieldType: string): ScoringOperator[] {
  switch (fieldType) {
    case "number":
      return ["is_filled", "is_empty", "equals", "not_equals", "gt", "lt"];
    case "boolean":
      return ["equals", "not_equals"];
    case "select":
      return ["is_filled", "is_empty", "equals", "not_equals"];
    case "multiselect":
      return ["is_filled", "is_empty", "contains"];
    case "date":
      return ["is_filled", "is_empty", "equals", "gt", "lt"];
    default:
      return ["is_filled", "is_empty", "equals", "not_equals", "contains"];
  }
}

// Operadores para os campos fixos (todos texto).
export const FIXED_FIELD_OPERATORS: ScoringOperator[] = [
  "is_filled",
  "is_empty",
  "equals",
  "not_equals",
  "contains",
];

// Rótulo legível do campo-alvo de uma regra.
export function fieldLabelFor(
  source: string,
  key: string | null,
  customLabels: Record<string, string>,
): string {
  if (source === "fixed") {
    return FIXED_FIELDS.find((f) => f.key === key)?.label ?? key ?? "—";
  }
  if (source === "custom") {
    return (key ? customLabels[key] : undefined) ?? key ?? "—";
  }
  return "Tag";
}

// Descrição em português da condição de uma regra (para exibir na lista).
export function describeRule(
  rule: Pick<ScoringRule, "field_source" | "field_key" | "operator" | "value">,
  customLabels: Record<string, string> = {},
): string {
  const op = OPERATOR_LABELS[rule.operator as ScoringOperator] ?? rule.operator;

  if (rule.field_source === "tag") {
    return `Contato ${op} "${rule.value ?? ""}"`;
  }

  const label = fieldLabelFor(rule.field_source, rule.field_key, customLabels);
  if (NO_VALUE_OPERATORS.includes(rule.operator as ScoringOperator)) {
    return `${label} ${op}`;
  }
  return `${label} ${op} "${rule.value ?? ""}"`;
}

// Faixa (tier) correspondente a um score: a de maior min_score que ele alcança.
export function tierForScore(
  score: number,
  tiers: ScoringTier[],
): ScoringTier | null {
  let match: ScoringTier | null = null;
  for (const tier of [...tiers].sort((a, b) => a.min_score - b.min_score)) {
    if (score >= tier.min_score) match = tier;
  }
  return match;
}
