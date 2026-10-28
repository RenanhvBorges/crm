import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import type { AdPlatform } from "./config";
import { loadIntegration, type ReadyIntegration } from "./integrations";
import { ingestGoogleEvents, type GoogleEvent, type SendResult } from "./google";
import { META_MAX_EVENT_AGE_MS, sendMetaEvents, type MetaEvent } from "./meta";

type Admin = SupabaseClient<Database>;
type Upload = Tables<"ad_conversion_uploads">;

// Espera antes da próxima tentativa, por número de tentativas já feitas (mesmo
// esquema dos webhooks de saída). Esgotada a lista, o envio vira "failed".
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 12 * 3_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length;
const BATCH_SIZE = 50;

export type ConversionDispatchSummary = { attempted: number; sent: number };

// Envia as conversões vencidas da fila, uma requisição por evento (o volume é
// baixo e um evento ruim não derruba os outros). O claim (attempts+1 e
// next_retry_at adiantado) vem antes da chamada, então dois ticks
// concorrentes nunca reenviam o mesmo evento.
export async function processAdConversions(admin: Admin): Promise<ConversionDispatchSummary> {
  const summary: ConversionDispatchSummary = { attempted: 0, sent: 0 };
  const { data: due } = await admin
    .from("ad_conversion_uploads")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at")
    .limit(BATCH_SIZE);
  if (!due?.length) return summary;

  const conversionIds = [...new Set(due.map((u) => u.conversion_id))];
  const { data: conversions } = await admin
    .from("ad_conversions")
    .select("id, google_conversion_action_id, meta_event_name")
    .in("id", conversionIds);
  const conversionById = new Map((conversions ?? []).map((c) => [c.id, c]));

  const integrations = new Map<AdPlatform, Awaited<ReturnType<typeof loadIntegration>>>();
  async function integrationFor(platform: AdPlatform) {
    if (!integrations.has(platform)) integrations.set(platform, await loadIntegration(admin, platform));
    return integrations.get(platform)!;
  }

  for (const upload of due) {
    const claimed = await claim(admin, upload);
    if (!claimed) continue;
    summary.attempted++;

    const platform = upload.platform as AdPlatform;
    const loaded = await integrationFor(platform);
    if (!loaded.ok) {
      await finish(admin, claimed, { ok: false, error: loaded.reason }, true);
      continue;
    }

    if (platform === "meta" && Date.parse(upload.event_time) < Date.now() - META_MAX_EVENT_AGE_MS) {
      await finish(
        admin,
        claimed,
        { ok: false, error: "Evento com mais de 7 dias: a Meta não aceita mais." },
        true,
      );
      continue;
    }

    const result = await send(loaded.integration, upload, conversionById.get(upload.conversion_id));
    await finish(admin, claimed, result, false);
    if (result.ok) summary.sent++;
  }

  return summary;
}

async function claim(admin: Admin, upload: Upload): Promise<Upload | null> {
  const now = Date.now();
  const { data } = await admin
    .from("ad_conversion_uploads")
    .update({
      attempts: upload.attempts + 1,
      last_attempt_at: new Date(now).toISOString(),
      next_retry_at: new Date(
        now + (BACKOFF_MS[upload.attempts] ?? BACKOFF_MS[BACKOFF_MS.length - 1]),
      ).toISOString(),
    })
    .eq("id", upload.id)
    .eq("status", "pending")
    .eq("attempts", upload.attempts)
    .select("*")
    .maybeSingle();
  return data ?? null;
}

async function send(
  integration: ReadyIntegration,
  upload: Upload,
  conversion: { google_conversion_action_id: string | null; meta_event_name: string | null } | undefined,
): Promise<SendResult> {
  if (integration.platform === "google_ads") {
    if (!conversion?.google_conversion_action_id) {
      return { ok: false, error: "A conversão não tem mais a ação do Google Ads." };
    }
    return ingestGoogleEvents({
      serviceAccount: integration.serviceAccount,
      customerId: integration.config.customer_id,
      conversionActionId: conversion.google_conversion_action_id,
      events: [upload.payload as unknown as GoogleEvent],
    });
  }
  return sendMetaEvents({
    datasetId: integration.config.dataset_id,
    accessToken: integration.accessToken,
    testEventCode: integration.config.test_event_code || undefined,
    events: [upload.payload as unknown as MetaEvent],
  });
}

async function finish(admin: Admin, upload: Upload, result: SendResult, permanent: boolean) {
  if (result.ok) {
    await admin
      .from("ad_conversion_uploads")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
        response: result.response as Json,
      })
      .eq("id", upload.id);
    return;
  }
  const exhausted = permanent || upload.attempts >= MAX_ATTEMPTS;
  await admin
    .from("ad_conversion_uploads")
    .update({
      status: exhausted ? "failed" : "pending",
      last_error: result.error,
      response: (result.response ?? null) as Json,
    })
    .eq("id", upload.id);
}
