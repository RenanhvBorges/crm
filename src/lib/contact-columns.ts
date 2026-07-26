import type { CustomFieldDefinition } from "@/lib/custom-fields";

// Um "column key" é um id estável: campo fixo ("name"), meta ("tags"/"score")
// ou campo personalizado ("cf:<key>"). Serve para visibilidade e filtros.
export type ColumnDef = {
  key: string;
  label: string;
  // tipo usado para escolher operadores de filtro e formato de exibição
  type: string;
  source: "fixed" | "meta" | "custom";
  customKey?: string;
};

export const FIXED_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Nome", type: "text", source: "fixed" },
  { key: "email", label: "E-mail", type: "email", source: "fixed" },
  { key: "phone", label: "Telefone", type: "phone", source: "fixed" },
  { key: "company", label: "Empresa", type: "text", source: "fixed" },
];

export const META_COLUMNS: ColumnDef[] = [
  { key: "tags", label: "Tags", type: "tags", source: "meta" },
  { key: "score", label: "Score", type: "score", source: "meta" },
];

// Coluna sempre presente (não removível): a de nome, que leva ao contato.
export const REQUIRED_COLUMN_KEY = "name";

export const DEFAULT_VISIBLE_COLUMNS = [
  "name",
  "email",
  "phone",
  "company",
  "tags",
  "score",
];

export function availableColumns(
  fieldDefs: Pick<CustomFieldDefinition, "key" | "label" | "field_type">[],
): ColumnDef[] {
  return [
    ...FIXED_COLUMNS,
    ...META_COLUMNS,
    ...fieldDefs.map((f) => ({
      key: `cf:${f.key}`,
      label: f.label,
      type: f.field_type,
      source: "custom" as const,
      customKey: f.key,
    })),
  ];
}

export function columnMap(columns: ColumnDef[]): Record<string, ColumnDef> {
  return Object.fromEntries(columns.map((c) => [c.key, c]));
}

// ---------------- Filtros ----------------

export type FilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "is_filled"
  | "is_empty"
  | "gt"
  | "lt"
  | "has_tag"
  | "not_has_tag";

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contém",
  equals: "é igual a",
  not_equals: "é diferente de",
  is_filled: "está preenchido",
  is_empty: "está vazio",
  gt: "maior que",
  lt: "menor que",
  has_tag: "tem a tag",
  not_has_tag: "não tem a tag",
};

export const NO_VALUE_FILTER_OPERATORS: FilterOperator[] = [
  "is_filled",
  "is_empty",
];

export function filterOperatorsForType(type: string): FilterOperator[] {
  switch (type) {
    case "tags":
      return ["has_tag", "not_has_tag"];
    case "score":
    case "number":
      return ["equals", "gt", "lt", "is_filled", "is_empty"];
    case "date":
      return ["equals", "gt", "lt", "is_filled", "is_empty"];
    case "boolean":
      return ["equals"];
    case "select":
      return ["equals", "not_equals", "is_filled", "is_empty"];
    case "multiselect":
      return ["contains", "is_filled", "is_empty"];
    default:
      return ["contains", "equals", "not_equals", "is_filled", "is_empty"];
  }
}

export type ViewFilter = {
  column: string;
  operator: FilterOperator;
  value: string;
};

export type ViewConfig = {
  columns: string[];
  filters: ViewFilter[];
};

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  score: number;
  custom_fields: Record<string, unknown>;
};

export function getColumnValue(contact: ContactRow, col: ColumnDef): unknown {
  if (col.source === "custom" && col.customKey) {
    return contact.custom_fields?.[col.customKey] ?? null;
  }
  switch (col.key) {
    case "name":
      return contact.name;
    case "email":
      return contact.email;
    case "phone":
      return contact.phone;
    case "company":
      return contact.company;
    case "tags":
      return contact.tags;
    case "score":
      return contact.score;
    default:
      return null;
  }
}

function isEmptyValue(raw: unknown): boolean {
  return (
    raw === null ||
    raw === undefined ||
    raw === "" ||
    (Array.isArray(raw) && raw.length === 0)
  );
}

function matchesFilter(
  contact: ContactRow,
  filter: ViewFilter,
  col: ColumnDef,
): boolean {
  const raw = getColumnValue(contact, col);
  const fv = filter.value ?? "";

  if (filter.operator === "has_tag" || filter.operator === "not_has_tag") {
    const tags = Array.isArray(raw) ? (raw as string[]) : [];
    const has = tags.some((t) => t.toLowerCase() === fv.toLowerCase());
    return filter.operator === "not_has_tag" ? !has : has;
  }

  const empty = isEmptyValue(raw);

  switch (filter.operator) {
    case "is_filled":
      return !empty;
    case "is_empty":
      return empty;
    case "equals":
      return String(raw ?? "").toLowerCase() === fv.toLowerCase();
    case "not_equals":
      return String(raw ?? "").toLowerCase() !== fv.toLowerCase();
    case "contains":
      if (Array.isArray(raw)) {
        return raw.some((x) => String(x).toLowerCase().includes(fv.toLowerCase()));
      }
      return String(raw ?? "").toLowerCase().includes(fv.toLowerCase());
    case "gt":
      return col.type === "date"
        ? String(raw ?? "") > fv
        : Number(raw) > Number(fv);
    case "lt":
      return col.type === "date"
        ? String(raw ?? "") < fv
        : Number(raw) < Number(fv);
    default:
      return true;
  }
}

// AND entre todos os filtros. Filtros que apontam para coluna inexistente
// são ignorados (não descartam o contato).
export function contactMatchesFilters(
  contact: ContactRow,
  filters: ViewFilter[],
  colsByKey: Record<string, ColumnDef>,
): boolean {
  return filters.every((filter) => {
    const col = colsByKey[filter.column];
    if (!col) return true;
    return matchesFilter(contact, filter, col);
  });
}
