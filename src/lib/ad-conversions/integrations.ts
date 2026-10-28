import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import {
  parseGoogleAdsConfig,
  parseMetaConfig,
  PLATFORM_LABEL,
  type AdPlatform,
  type GoogleAdsConfig,
  type MetaConfig,
} from "./config";
import { ingestGoogleEvents, parseServiceAccount, type ServiceAccount } from "./google";
import { fetchMetaDataset } from "./meta";
import { sha256 } from "./identity";

type Admin = SupabaseClient<Database>;

export type ReadyIntegration =
  | { platform: "google_ads"; config: GoogleAdsConfig; serviceAccount: ServiceAccount }
  | { platform: "meta"; config: MetaConfig; accessToken: string };

// Lê a configuração e a credencial (Vault, só com service role). Devolve o
// motivo quando a integração não pode enviar, para o log do passo/da fila.
export async function loadIntegration(
  admin: Admin,
  platform: AdPlatform,
): Promise<{ ok: true; integration: ReadyIntegration } | { ok: false; reason: string }> {
  const { data: row } = await admin
    .from("ad_integrations")
    .select("*")
    .eq("platform", platform)
    .maybeSingle();
  if (!row?.is_active) return { ok: false, reason: `Integração ${PLATFORM_LABEL[platform]} desativada.` };
  return readyFromRow(admin, row);
}

async function readyFromRow(
  admin: Admin,
  row: Tables<"ad_integrations">,
): Promise<{ ok: true; integration: ReadyIntegration } | { ok: false; reason: string }> {
  const platform = row.platform as AdPlatform;
  const label = PLATFORM_LABEL[platform];
  const { data: secret, error } = await admin.rpc("get_ad_integration_secret", { p_platform: platform });
  if (error) return { ok: false, reason: `Não foi possível ler a credencial do ${label}: ${error.message}` };
  if (!secret) return { ok: false, reason: `Integração ${label} sem credencial cadastrada.` };

  if (platform === "google_ads") {
    const config = parseGoogleAdsConfig(row.config);
    if (!config.customer_id) return { ok: false, reason: "Informe o ID da conta do Google Ads." };
    try {
      return { ok: true, integration: { platform, config, serviceAccount: parseServiceAccount(secret) } };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "Conta de serviço inválida." };
    }
  }

  const config = parseMetaConfig(row.config);
  if (!config.dataset_id) return { ok: false, reason: "Informe o ID do dataset (pixel) da Meta." };
  return { ok: true, integration: { platform: "meta", config, accessToken: secret } };
}

// "Testar conexão" da tela de Configurações. Google: troca a chave por um
// token e valida um evento de exemplo (validateOnly, nada é gravado) na
// primeira conversão com ação do Google. Meta: lê o dataset com o token.
export async function testIntegration(
  admin: Admin,
  platform: AdPlatform,
): Promise<{ ok: boolean; message: string }> {
  const { data: row } = await admin
    .from("ad_integrations")
    .select("*")
    .eq("platform", platform)
    .maybeSingle();
  if (!row) return { ok: false, message: "Integração não encontrada." };
  const ready = await readyFromRow(admin, row);
  if (!ready.ok) return { ok: false, message: ready.reason };
  const integration = ready.integration;

  if (integration.platform === "meta") {
    const result = await fetchMetaDataset(integration.config.dataset_id, integration.accessToken);
    if (!result.ok) return { ok: false, message: result.error };
    const name = typeof result.response.name === "string" ? result.response.name : integration.config.dataset_id;
    return {
      ok: true,
      message: `Token válido para o dataset "${name}".${integration.config.test_event_code ? " Envios vão para Eventos de teste enquanto o código de teste estiver preenchido." : ""}`,
    };
  }

  const { data: conversion } = await admin
    .from("ad_conversions")
    .select("google_conversion_action_id")
    .not("google_conversion_action_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (!conversion?.google_conversion_action_id) {
    return {
      ok: true,
      message:
        "Conta de serviço aceita pelo Google. Cadastre uma conversão com a ação do Google Ads para validar também a conta e a ação.",
    };
  }
  const result = await ingestGoogleEvents({
    serviceAccount: integration.serviceAccount,
    customerId: integration.config.customer_id,
    conversionActionId: conversion.google_conversion_action_id,
    validateOnly: true,
    events: [
      {
        transactionId: "teste-conexao",
        eventTimestamp: new Date().toISOString(),
        eventSource: "WEB",
        userData: { userIdentifiers: [{ emailAddress: sha256("teste@exemplo.com") }] },
      },
    ],
  });
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, message: "Conta de serviço, conta do Google Ads e ação de conversão validadas." };
}
