import type { Tables } from "@/lib/supabase/database.types";

export type CustomFieldDefinition = Tables<"custom_field_definitions">;
export type CustomFieldGroup = Tables<"custom_field_groups">;

export const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sim/Não" },
  { value: "select", label: "Seleção única" },
  { value: "multiselect", label: "Seleção múltipla" },
  { value: "url", label: "Link" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
] as const;

export type CustomFieldValues = Record<string, string | number | boolean | string[] | null>;
