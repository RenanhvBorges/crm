"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBulk, type BulkResult } from "@/lib/bulk";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import { normalizeCustomerId, type AdPlatform } from "@/lib/ad-conversions/config";
import { parseServiceAccount } from "@/lib/ad-conversions/google";
import { testIntegration } from "@/lib/ad-conversions/integrations";

const PATH = "/settings/conversions";

// Credenciais: só o diretor comercial altera. A gravação usa o service role
// (ad_integrations é só leitura para usuários; o segredo vai para o Vault).
async function requireDirector(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "diretor_comercial") {
    throw new Error("Apenas o diretor comercial pode alterar as credenciais de anúncios.");
  }
  return user.id;
}

function parsePlatform(raw: unknown): AdPlatform {
  if (raw === "google_ads" || raw === "meta") return raw;
  throw new Error("Plataforma inválida.");
}

async function saveSecret(platform: AdPlatform, secret: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("set_ad_integration_secret", { p_platform: platform, p_secret: secret });
  if (error) throw new Error(`Não foi possível gravar a credencial: ${error.message}`);
}

export async function saveGoogleIntegration(formData: FormData): Promise<BulkResult> {
  return runBulk(async () => {
    const userId = await requireDirector();
    const customerId = normalizeCustomerId(String(formData.get("customer_id") ?? ""));
    const serviceAccountJson = String(formData.get("service_account") ?? "").trim();
    const isActive = formData.get("is_active") === "on";
    if (!/^\d{10}$/.test(customerId)) {
      throw new Error("O ID da conta do Google Ads tem 10 dígitos (ex.: 123-456-7890).");
    }

    const admin = createAdminClient();
    const { data: current } = await admin
      .from("ad_integrations")
      .select("secret_hint")
      .eq("platform", "google_ads")
      .single();

    let secretHint = current?.secret_hint ?? null;
    if (serviceAccountJson) {
      const sa = parseServiceAccount(serviceAccountJson);
      await saveSecret("google_ads", serviceAccountJson);
      secretHint = sa.client_email;
    }
    if (isActive && !secretHint) throw new Error("Envie o JSON da conta de serviço antes de ativar.");

    const { error } = await admin
      .from("ad_integrations")
      .update({
        config: { customer_id: customerId },
        secret_hint: secretHint,
        is_active: isActive,
        updated_by: userId,
      })
      .eq("platform", "google_ads");
    if (error) throw new Error(error.message);
    revalidatePath(PATH);
    return "Integração do Google Ads salva.";
  });
}

export async function saveMetaIntegration(formData: FormData): Promise<BulkResult> {
  return runBulk(async () => {
    const userId = await requireDirector();
    const datasetId = String(formData.get("dataset_id") ?? "").replace(/\D/g, "");
    const accessToken = String(formData.get("access_token") ?? "").trim();
    const testEventCode = String(formData.get("test_event_code") ?? "").trim();
    const isActive = formData.get("is_active") === "on";
    if (!/^\d{5,25}$/.test(datasetId)) throw new Error("Informe o ID do dataset (pixel) da Meta, só números.");
    if (testEventCode && !/^[A-Za-z0-9]{1,40}$/.test(testEventCode)) {
      throw new Error("O código de teste da Meta tem só letras e números (ex.: TEST12345).");
    }
    if (accessToken && accessToken.length < 20) throw new Error("O token de acesso parece incompleto.");

    const admin = createAdminClient();
    const { data: current } = await admin
      .from("ad_integrations")
      .select("secret_hint")
      .eq("platform", "meta")
      .single();

    let secretHint = current?.secret_hint ?? null;
    if (accessToken) {
      await saveSecret("meta", accessToken);
      secretHint = `token terminado em ${accessToken.slice(-4)}`;
    }
    if (isActive && !secretHint) throw new Error("Informe o token de acesso antes de ativar.");

    const { error } = await admin
      .from("ad_integrations")
      .update({
        config: { dataset_id: datasetId, test_event_code: testEventCode },
        secret_hint: secretHint,
        is_active: isActive,
        updated_by: userId,
      })
      .eq("platform", "meta");
    if (error) throw new Error(error.message);
    revalidatePath(PATH);
    return "Integração da Meta salva.";
  });
}

export async function removeIntegrationSecret(platformRaw: string): Promise<BulkResult> {
  return runBulk(async () => {
    const userId = await requireDirector();
    const platform = parsePlatform(platformRaw);
    await saveSecret(platform, "");
    const admin = createAdminClient();
    const { error } = await admin
      .from("ad_integrations")
      .update({ secret_hint: null, is_active: false, last_test_ok: null, updated_by: userId })
      .eq("platform", platform);
    if (error) throw new Error(error.message);
    revalidatePath(PATH);
    return "Credencial removida e integração desativada.";
  });
}

export async function testIntegrationAction(platformRaw: string): Promise<BulkResult> {
  return runBulk(async () => {
    await requireDirector();
    const platform = parsePlatform(platformRaw);
    const admin = createAdminClient();
    const result = await testIntegration(admin, platform);
    await admin
      .from("ad_integrations")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_ok: result.ok,
        last_test_message: result.message,
      })
      .eq("platform", platform);
    revalidatePath(PATH);
    if (!result.ok) throw new Error(result.message);
    return result.message;
  });
}

// ---------------- Catálogo de conversões ----------------

function parseConversionFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const googleId = String(formData.get("google_conversion_action_id") ?? "").replace(/\D/g, "");
  const metaEvent = String(formData.get("meta_event_name") ?? "").trim();
  const valueMode = String(formData.get("value_mode") ?? "none");
  const fixedValue = Number(String(formData.get("fixed_value") ?? "0").replace(",", ".")) || 0;
  const currency = String(formData.get("currency") ?? "BRL").trim().toUpperCase() || "BRL";

  if (!name) throw new Error("Dê um nome à conversão.");
  if (!googleId && !metaEvent) {
    throw new Error("Informe a ação de conversão do Google Ads, o evento da Meta ou os dois.");
  }
  if (metaEvent && !/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(metaEvent)) {
    throw new Error("O evento da Meta usa letras, números e _ (ex.: Lead, LeadQualificado).");
  }
  if (!["none", "fixed", "deal"].includes(valueMode)) throw new Error("Tipo de valor inválido.");
  if (fixedValue < 0) throw new Error("O valor não pode ser negativo.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Moeda inválida (use o código de 3 letras, ex.: BRL).");

  return {
    name,
    google_conversion_action_id: googleId || null,
    meta_event_name: metaEvent || null,
    value_mode: valueMode,
    fixed_value: valueMode === "fixed" ? fixedValue : 0,
    currency,
  };
}

export async function createConversion(formData: FormData): Promise<BulkResult> {
  return runBulk(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("ad_conversions").insert(parseConversionFormData(formData));
    if (error) throw new Error(error.message);
    revalidatePath(PATH);
    return "Conversão criada.";
  });
}

export async function updateConversion(id: string, formData: FormData): Promise<BulkResult> {
  return runBulk(async () => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("ad_conversions")
      .update(parseConversionFormData(formData))
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(PATH);
    return "Conversão atualizada.";
  });
}

export async function setConversionActive(id: string, isActive: boolean): Promise<BulkResult> {
  return runBulk(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("ad_conversions").update({ is_active: isActive }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(PATH);
  });
}

export async function deleteConversion(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ad_conversions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

// Devolve um envio que falhou para a fila; o motor tenta de novo no próximo tick.
export async function retryUpload(id: string): Promise<BulkResult> {
  return runBulk(async () => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("ad_conversion_uploads")
      .update({ status: "pending", attempts: 0, next_retry_at: new Date().toISOString(), last_error: null })
      .eq("id", id)
      .eq("status", "failed");
    if (error) throw new Error(error.message);
    kickAutomationProcessor();
    revalidatePath(PATH);
    return "Envio devolvido para a fila.";
  });
}
