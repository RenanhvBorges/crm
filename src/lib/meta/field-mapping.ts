import { z } from "zod";

// Mapeamento entre as perguntas de um formulário instantâneo e os campos do
// contato. Client-safe de propósito: a tela de configuração monta o mapa e o
// motor de ingestão aplica o mesmo módulo. Mesmo molde de união discriminada
// de src/lib/automations/flow.ts.

export const FIXED_TARGETS = ["name", "email", "phone", "company"] as const;
export type FixedTarget = (typeof FIXED_TARGETS)[number];

export const FIXED_TARGET_LABEL: Record<FixedTarget, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  company: "Empresa",
};

export const fieldMappingSchema = z.discriminatedUnion("target", [
  z.object({ target: z.literal("ignore") }),
  z.object({ target: z.literal("fixed"), key: z.enum(FIXED_TARGETS) }),
  z.object({ target: z.literal("custom"), key: z.string().min(1) }),
]);

export type FieldMapping = z.infer<typeof fieldMappingSchema>;
export type FieldMappings = Record<string, FieldMapping>;

export const fieldMappingsSchema = z.record(z.string(), fieldMappingSchema);

export function parseFieldMappings(raw: unknown): FieldMappings {
  const result = fieldMappingsSchema.safeParse(raw);
  return result.success ? result.data : {};
}

// Perguntas padrão da Meta → campo fixo do contato. As chaves vêm em
// `questions[].key` do formulário e se repetem em `field_data[].name`.
const AUTO_MAP: Record<string, FixedTarget> = {
  full_name: "name",
  first_name: "name",
  last_name: "name",
  email: "email",
  work_email: "email",
  phone_number: "phone",
  work_phone_number: "phone",
  company_name: "company",
};

// Ordem em que os pedaços do nome são juntados quando o formulário pergunta
// nome e sobrenome separados.
const NAME_ORDER = ["full_name", "first_name", "last_name"];

// Dados de atribuição do lead expostos como pseudo-perguntas: não vêm em
// field_data, mas podem ser mapeados para campos personalizados do contato.
export const ATTRIBUTION_KEYS = [
  "__campaign_name",
  "__adset_name",
  "__ad_name",
  "__form_name",
  "__platform",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export const ATTRIBUTION_LABEL: Record<AttributionKey, string> = {
  __campaign_name: "Campanha (Meta)",
  __adset_name: "Conjunto de anúncios (Meta)",
  __ad_name: "Anúncio (Meta)",
  __form_name: "Formulário (Meta)",
  __platform: "Plataforma (Facebook/Instagram)",
};

export type FormQuestion = { key: string; label?: string; type?: string };

// Auto-mapeia as perguntas conhecidas e ignora o resto — mapear pergunta
// customizada para campo personalizado é decisão do usuário na tela.
export function defaultMappings(questions: FormQuestion[]): FieldMappings {
  const mappings: FieldMappings = {};
  for (const question of questions) {
    const target = AUTO_MAP[question.key];
    mappings[question.key] = target ? { target: "fixed", key: target } : { target: "ignore" };
  }
  return mappings;
}

export type LeadFieldData = { name: string; values: string[] };

export type LeadAttribution = Partial<Record<AttributionKey, string | null | undefined>>;

export type NormalizedLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  customFields: Record<string, string>;
};

function firstValue(values: string[] | undefined): string | null {
  const value = values?.find((v) => typeof v === "string" && v.trim());
  return value ? value.trim() : null;
}

// Mapeamento salvo tem prioridade; sem ele, cai no auto-mapeamento para que um
// formulário recém-criado na Meta já traga nome/e-mail/telefone sem
// configuração manual.
function mappingFor(questionKey: string, mappings: FieldMappings): FieldMapping {
  const saved = mappings[questionKey];
  if (saved) return saved;
  const auto = AUTO_MAP[questionKey];
  return auto ? { target: "fixed", key: auto } : { target: "ignore" };
}

// Aplica o mapeamento a um lead. Campos fixos com mais de uma origem (nome +
// sobrenome) são concatenados na ordem do formulário; o resto sobrescreve.
export function normalizeLead(
  fieldData: LeadFieldData[],
  attribution: LeadAttribution,
  mappings: FieldMappings,
): NormalizedLead {
  const fixed: Record<FixedTarget, string[]> = { name: [], email: [], phone: [], company: [] };
  const customFields: Record<string, string> = {};

  const ordered = [...(fieldData ?? [])].sort((a, b) => {
    const ai = NAME_ORDER.indexOf(a.name);
    const bi = NAME_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (const field of ordered) {
    const mapping = mappingFor(field.name, mappings);
    const value = firstValue(field.values);
    if (!value || mapping.target === "ignore") continue;
    if (mapping.target === "fixed") fixed[mapping.key].push(value);
    else customFields[mapping.key] = value;
  }

  for (const key of ATTRIBUTION_KEYS) {
    const mapping = mappings[key];
    const value = attribution[key];
    if (!mapping || mapping.target === "ignore" || !value) continue;
    if (mapping.target === "fixed") fixed[mapping.key].push(value);
    else customFields[mapping.key] = value;
  }

  return {
    // Nome vira a junção ("João" + "Silva"); os demais ficam com o primeiro
    // valor preenchido, que é o que faz sentido para e-mail/telefone/empresa.
    name: fixed.name.length ? [...new Set(fixed.name)].join(" ") : null,
    email: fixed.email[0]?.toLowerCase() ?? null,
    phone: fixed.phone[0] ?? null,
    company: fixed.company[0] ?? null,
    customFields,
  };
}
