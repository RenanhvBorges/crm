// Tipos e helpers das integrações de anúncios e do catálogo de conversões.
// Client-safe: usado pela tela de Configurações, pelo builder e pelo servidor.

export type AdPlatform = "google_ads" | "meta";

export const AD_PLATFORMS: AdPlatform[] = ["google_ads", "meta"];

export const PLATFORM_LABEL: Record<AdPlatform, string> = {
  google_ads: "Google Ads",
  meta: "Meta",
};

// ad_integrations.config por plataforma. A credencial (JSON da conta de
// serviço / token) nunca fica aqui: vive no Vault.
export type GoogleAdsConfig = { customer_id: string };
export type MetaConfig = { dataset_id: string; test_event_code: string };

function record(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

export function parseGoogleAdsConfig(raw: unknown): GoogleAdsConfig {
  const r = record(raw);
  return { customer_id: typeof r.customer_id === "string" ? r.customer_id : "" };
}

export function parseMetaConfig(raw: unknown): MetaConfig {
  const r = record(raw);
  return {
    dataset_id: typeof r.dataset_id === "string" ? r.dataset_id : "",
    test_event_code: typeof r.test_event_code === "string" ? r.test_event_code : "",
  };
}

// ID da conta do Google Ads aceita "123-456-7890"; a API quer só os dígitos.
export function normalizeCustomerId(raw: string): string {
  return raw.replace(/\D/g, "");
}

export const VALUE_MODES = [
  { value: "none", label: "Sem valor" },
  { value: "fixed", label: "Valor fixo" },
  { value: "deal", label: "Valor do negócio" },
] as const;

export type ValueMode = (typeof VALUE_MODES)[number]["value"];

// Eventos padrão da Meta mais usados em funil de leads; o campo aceita também
// um evento personalizado (ex.: LeadQualificado).
export const META_EVENT_SUGGESTIONS = [
  "Lead",
  "Schedule",
  "SubmitApplication",
  "CompleteRegistration",
  "Contact",
  "Purchase",
];

export const UPLOAD_STATUS_LABEL: Record<string, string> = {
  pending: "Na fila",
  sent: "Enviada",
  failed: "Falhou",
};
