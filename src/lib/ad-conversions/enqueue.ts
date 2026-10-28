import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import type { StepResult } from "@/lib/automations/actions-exec";
import { PLATFORM_LABEL, type AdPlatform } from "./config";
import { clickIdsFrom, sha256 } from "./identity";
import { buildGoogleEvent } from "./google";
import { buildMetaEvent } from "./meta";

type Admin = SupabaseClient<Database>;
type Contact = Tables<"contacts">;

// Passo "Enviar conversão offline": monta o evento de cada plataforma da
// conversão e põe na fila (ad_conversion_uploads). Quem envia é o
// processAdConversions, no mesmo tick do motor — uma plataforma fora do ar
// não faz a automação falhar, e cada plataforma tem as próprias tentativas.
export async function enqueueAdConversion(
  admin: Admin,
  input: {
    conversionId: string;
    contact: Contact;
    deal: { id: string; value: number } | null;
    automationId: string;
    enrollmentId: string;
  },
): Promise<StepResult> {
  const { data: conversion } = await admin
    .from("ad_conversions")
    .select("*")
    .eq("id", input.conversionId)
    .maybeSingle();
  if (!conversion) return { status: "error", error: "Conversão não existe mais." };
  if (!conversion.is_active) return { status: "skipped", detail: { reason: "conversão desativada" } };

  // Conta uma vez por contato; com o valor do negócio, uma vez por negócio
  // (cada venda conta). A mesma chave vira transactionId/event_id, o que
  // também deduplica do lado do Google e da Meta.
  let value: number | null = null;
  let dedupeKey = `contact:${input.contact.id}`;
  if (conversion.value_mode === "fixed") value = Number(conversion.fixed_value);
  if (conversion.value_mode === "deal") {
    if (!input.deal) return { status: "skipped", detail: { reason: "contato sem negócio para usar o valor" } };
    value = Number(input.deal.value);
    dedupeKey = `deal:${input.deal.id}`;
  }
  const eventId = sha256(`${conversion.id}:${dedupeKey}`).slice(0, 40);
  const eventTime = new Date();
  const clickIds = clickIdsFrom(input.contact.custom_fields, input.contact.created_at);

  const { data: integrations } = await admin.from("ad_integrations").select("platform, is_active");
  const active = new Set((integrations ?? []).filter((i) => i.is_active).map((i) => i.platform));

  const targets: { platform: AdPlatform; payload: Json | null }[] = [];
  if (conversion.google_conversion_action_id) {
    targets.push({
      platform: "google_ads",
      payload: buildGoogleEvent({
        transactionId: eventId,
        eventTime,
        value,
        currency: conversion.currency,
        email: input.contact.email,
        phone: input.contact.phone,
        clickIds,
      }) as Json | null,
    });
  }
  if (conversion.meta_event_name) {
    targets.push({
      platform: "meta",
      payload: buildMetaEvent({
        eventName: conversion.meta_event_name,
        eventId,
        eventTime,
        value,
        currency: conversion.currency,
        contactId: input.contact.id,
        name: input.contact.name,
        email: input.contact.email,
        phone: input.contact.phone,
        clickIds,
      }) as Json | null,
    });
  }
  if (!targets.length) {
    return { status: "skipped", detail: { reason: "conversão sem ação do Google nem evento da Meta" } };
  }

  const outcome: Record<string, string> = {};
  let queued = 0;
  for (const target of targets) {
    const label = PLATFORM_LABEL[target.platform];
    if (!active.has(target.platform)) {
      outcome[target.platform] = `integração ${label} desativada`;
      continue;
    }
    if (!target.payload) {
      outcome[target.platform] =
        target.platform === "google_ads"
          ? "contato sem gclid, e-mail ou telefone"
          : "contato sem e-mail, telefone, fbc ou fbp";
      continue;
    }
    const { data, error } = await admin
      .from("ad_conversion_uploads")
      .upsert(
        {
          conversion_id: conversion.id,
          platform: target.platform,
          contact_id: input.contact.id,
          deal_id: input.deal?.id ?? null,
          automation_id: input.automationId,
          enrollment_id: input.enrollmentId,
          dedupe_key: dedupeKey,
          event_time: eventTime.toISOString(),
          value,
          currency: value !== null ? conversion.currency : null,
          payload: target.payload,
        },
        { onConflict: "platform,conversion_id,dedupe_key", ignoreDuplicates: true },
      )
      .select("id");
    if (error) return { status: "error", error: `Falha ao enfileirar (${label}): ${error.message}` };
    if (data?.length) {
      queued++;
      outcome[target.platform] = "na fila";
    } else {
      outcome[target.platform] = "já enviada antes";
    }
  }

  const detail = { conversion: conversion.name, ...outcome };
  if (queued) return { status: "ok", detail };
  return { status: "skipped", detail: { ...detail, reason: Object.values(outcome).join("; ") } };
}
