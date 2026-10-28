// Origem do lead (contacts.lead_source). O valor é calculado no banco pela
// função detect_lead_source (trigger contacts_set_lead_source_trg) a partir dos
// dados de atribuição em custom_fields, no primeiro toque; ver AGENTS.md.

export const LEAD_SOURCES = [
  { value: "google_ads", label: "Google Ads", className: "bg-sky-50 text-sky-700" },
  { value: "meta_ads", label: "Meta Ads", className: "bg-indigo-50 text-indigo-700" },
  { value: "outra", label: "Outra", className: "bg-bg-surface-2 text-fg-3" },
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number]["value"];

export function isLeadSource(value: unknown): value is LeadSource {
  return LEAD_SOURCES.some((s) => s.value === value);
}

export function leadSourceLabel(value: string | null | undefined): string | null {
  return LEAD_SOURCES.find((s) => s.value === value)?.label ?? null;
}
