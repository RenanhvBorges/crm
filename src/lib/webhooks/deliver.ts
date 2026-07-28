import "server-only";
import { createHmac, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";

type Admin = SupabaseClient<Database>;
type AutomationEvent = Tables<"automation_events">;
type Subscription = Tables<"webhook_subscriptions">;

const SECRET_PREFIX = "whsec_";

// Espera entre tentativas, por número de tentativas já feitas. Esgotada a
// lista, a entrega vira "failed" definitivamente.
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 12 * 3_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length;
const BATCH_SIZE = 50;
const REQUEST_TIMEOUT_MS = 10_000;

// Curinga aceito em webhook_subscriptions.events para assinar tudo.
export const ALL_EVENTS = "*";

export function generateWebhookSecret(): string {
  return `${SECRET_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

// Enfileira uma entrega por assinatura ativa interessada no evento. O payload
// é congelado aqui: a entrega independe do evento depois disso.
export async function fanOutEvent(
  admin: Admin,
  event: AutomationEvent,
  subscriptions: Subscription[],
): Promise<number> {
  const interested = subscriptions.filter(
    (s) => s.is_active && (s.events.includes(ALL_EVENTS) || s.events.includes(event.event_type)),
  );
  if (!interested.length) return 0;

  const rows = interested.map((s) => ({
    subscription_id: s.id,
    event_id: event.id,
    event_type: event.event_type,
    payload: {
      event_id: event.id,
      type: event.event_type,
      created_at: event.created_at,
      data: event.payload,
    } as Json,
  }));

  const { error } = await admin.from("webhook_deliveries").insert(rows);
  if (error) {
    console.error("[webhooks] falha ao enfileirar entregas:", error.message);
    return 0;
  }
  return rows.length;
}

export type DeliverySummary = { attempted: number; succeeded: number };

// Envia as entregas vencidas. O claim (attempts+1 e next_retry_at adiantado)
// acontece antes do POST, então dois ticks concorrentes nunca reenviam a mesma.
export async function processWebhookDeliveries(admin: Admin): Promise<DeliverySummary> {
  const summary: DeliverySummary = { attempted: 0, succeeded: 0 };
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("webhook_deliveries")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", nowIso)
    .limit(BATCH_SIZE);
  if (!due?.length) return summary;

  const subscriptionIds = [...new Set(due.map((d) => d.subscription_id))];
  const { data: subscriptions } = await admin
    .from("webhook_subscriptions")
    .select("*")
    .in("id", subscriptionIds);
  const subscriptionById = new Map((subscriptions ?? []).map((s) => [s.id, s]));

  for (const delivery of due) {
    const subscription = subscriptionById.get(delivery.subscription_id);
    if (!subscription || !subscription.is_active) {
      await admin
        .from("webhook_deliveries")
        .update({ status: "failed", last_attempt_at: new Date().toISOString() })
        .eq("id", delivery.id);
      continue;
    }

    const attempts = delivery.attempts + 1;
    const backoff = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length) - 1];

    const { data: claimed } = await admin
      .from("webhook_deliveries")
      .update({
        attempts,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + backoff).toISOString(),
      })
      .eq("id", delivery.id)
      .eq("status", "pending")
      .lte("next_retry_at", nowIso)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    summary.attempted++;

    const body = JSON.stringify({ id: delivery.id, ...(delivery.payload as object) });
    const timestamp = Math.floor(Date.now() / 1000);

    let responseStatus: number | null = null;
    let ok = false;
    try {
      const response = await fetch(subscription.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-oxford-event": delivery.event_type,
          "x-oxford-event-id": delivery.event_id ?? "",
          "x-oxford-delivery-id": delivery.id,
          "x-oxford-timestamp": String(timestamp),
          "x-oxford-signature": `sha256=${signPayload(subscription.secret, timestamp, body)}`,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      responseStatus = response.status;
      ok = response.ok;
    } catch {
      ok = false;
    }

    if (ok) {
      summary.succeeded++;
      await admin
        .from("webhook_deliveries")
        .update({ status: "success", response_status: responseStatus })
        .eq("id", delivery.id);
    } else {
      await admin
        .from("webhook_deliveries")
        .update({
          response_status: responseStatus,
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", delivery.id);
    }
  }

  return summary;
}
