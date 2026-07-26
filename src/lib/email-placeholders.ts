import type { Tables } from "@/lib/supabase/database.types";
import type { CustomFieldDefinition } from "@/lib/custom-fields";

type Contact = Tables<"contacts">;

const FIXED_FIELDS: Record<string, (c: Contact) => string> = {
  nome: (c) => c.name ?? "",
  email: (c) => c.email ?? "",
  telefone: (c) => c.phone ?? "",
  empresa: (c) => c.company ?? "",
};

const FIXED_LABELS: Record<keyof typeof FIXED_FIELDS, string> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  empresa: "Empresa",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SelectOption = { value: string; label: string };

function formatCustomFieldValue(value: unknown, def: CustomFieldDefinition): string {
  if (value === null || value === undefined || value === "") return "";

  switch (def.field_type) {
    case "boolean":
      return value ? "Sim" : "Não";
    case "date": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
    }
    case "select": {
      const options = (def.options as SelectOption[] | null) ?? [];
      return options.find((o) => o.value === value)?.label ?? String(value);
    }
    case "multiselect": {
      const options = (def.options as SelectOption[] | null) ?? [];
      const values = Array.isArray(value) ? (value as string[]) : [];
      return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
    }
    default:
      return String(value);
  }
}

const PLACEHOLDER_RE = /\{\{contato\.([a-zA-Z0-9_.]+)\}\}/g;

// Substitui {{contato.nome}} / {{contato.campo.<key>}} pelo valor real do
// contato, sempre escapando HTML (o valor é conteúdo administrativo, não
// confiável o bastante para ser inserido cru num e-mail). Tokens
// desconhecidos são preservados como estão, para facilitar identificar erro
// de digitação em vez de apagar silenciosamente o trecho.
export function resolveContactPlaceholders(
  html: string,
  contact: Contact,
  customFieldDefs: CustomFieldDefinition[],
): string {
  const customByKey = new Map(customFieldDefs.map((d) => [d.key, d]));
  const customValues = (contact.custom_fields as Record<string, unknown> | null) ?? {};

  return html.replace(PLACEHOLDER_RE, (match, path: string) => {
    if (path.startsWith("campo.")) {
      const key = path.slice("campo.".length);
      const def = customByKey.get(key);
      if (!def) return match;
      return escapeHtml(formatCustomFieldValue(customValues[key], def));
    }
    const fixed = FIXED_FIELDS[path as keyof typeof FIXED_FIELDS];
    if (!fixed) return match;
    return escapeHtml(fixed(contact));
  });
}

export type PlaceholderOption = { token: string; label: string };

// Lista os placeholders disponíveis para a UI (picker): campos fixos +
// campos personalizados de entity='contact'. Placeholders de negócio não
// existem nesta fase (ambíguos quando o contato tem múltiplos negócios).
export function listAvailablePlaceholders(
  customFieldDefs: CustomFieldDefinition[],
): PlaceholderOption[] {
  const fixed = (Object.keys(FIXED_FIELDS) as (keyof typeof FIXED_FIELDS)[]).map((key) => ({
    token: `{{contato.${key}}}`,
    label: FIXED_LABELS[key],
  }));
  const custom = customFieldDefs
    .filter((d) => d.entity === "contact")
    .map((d) => ({ token: `{{contato.campo.${d.key}}}`, label: d.label }));
  return [...fixed, ...custom];
}
