"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateWebhookSecret } from "@/lib/webhooks/deliver";
import { EVENT_TYPES } from "@/lib/automations/triggers";

const VALID_EVENTS = new Set([...EVENT_TYPES.map((e) => e.value), "*"]);

function parseWebhookFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const events = formData.getAll("events").map(String).filter((e) => VALID_EVENTS.has(e));

  if (!name) throw new Error("Informe um nome para o webhook.");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("protocolo");
    }
  } catch {
    throw new Error("Informe uma URL válida (https://...).");
  }
  if (!events.length) throw new Error("Selecione ao menos um evento.");

  return { name, url, events };
}

export async function createWebhook(formData: FormData) {
  const supabase = await createClient();
  const values = parseWebhookFormData(formData);

  const { error } = await supabase
    .from("webhook_subscriptions")
    .insert({ ...values, secret: generateWebhookSecret() });
  if (error) throw new Error(error.message);

  revalidatePath("/settings/webhooks");
}

export async function updateWebhook(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = parseWebhookFormData(formData);

  const { error } = await supabase.from("webhook_subscriptions").update(values).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/webhooks");
}

export async function setWebhookActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webhook_subscriptions")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/webhooks");
}

export async function deleteWebhook(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("webhook_subscriptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/webhooks");
}
