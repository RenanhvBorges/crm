import { Webhook } from "svix";
import type { WebhookEventPayload } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const EVENT_TO_COLUMN: Partial<Record<WebhookEventPayload["type"], string>> = {
  "email.sent": "sent_at",
  "email.delivered": "delivered_at",
  "email.opened": "opened_at",
  "email.clicked": "clicked_at",
  "email.bounced": "bounced_at",
  "email.complained": "complained_at",
};

const EVENT_TO_STATUS: Partial<Record<WebhookEventPayload["type"], string>> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

// Evita que um evento fora de ordem (ex: "sent" chegando depois de "opened")
// regrida o status — só avança.
const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  bounced: 90,
  complained: 91,
  failed: 92,
  suppressed: 93,
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const payloadText = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Cabeçalhos de assinatura ausentes." }, { status: 400 });
  }

  let event: WebhookEventPayload;
  try {
    event = new Webhook(secret).verify(payloadText, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEventPayload;
  } catch {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  // Eventos sem e-mail associado (contact.*, domain.*) não interessam aqui.
  if (!("data" in event) || !("email_id" in event.data)) {
    return Response.json({ received: true });
  }

  const emailId = event.data.email_id;
  const supabase = createAdminClient();

  const { data: recipient } = await supabase
    .from("email_campaign_recipients")
    .select("*")
    .eq("resend_email_id", emailId)
    .maybeSingle();
  if (!recipient) return Response.json({ received: true });

  const update: Record<string, string> = {};

  const column = EVENT_TO_COLUMN[event.type];
  if (column && !(recipient as Record<string, unknown>)[column]) {
    update[column] = event.created_at;
  }

  const newStatus = EVENT_TO_STATUS[event.type];
  if (newStatus && STATUS_PRIORITY[newStatus] > STATUS_PRIORITY[recipient.status]) {
    update.status = newStatus;
  }

  if (Object.keys(update).length) {
    // Colunas dinâmicas (definidas em tempo de execução via EVENT_TO_COLUMN):
    // o tipo gerado do Supabase não aceita indexação por string arbitrária.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("email_campaign_recipients") as any)
      .update(update)
      .eq("id", recipient.id);
  }

  const linkUrl = event.type === "email.clicked" ? event.data.click.link : null;

  // resend_event_id unique + svix-id estável entre retries do mesmo evento:
  // conflito aqui é só reentrega, ignora silenciosamente (idempotência).
  const { error: insertError } = await supabase.from("email_events").insert({
    recipient_id: recipient.id,
    campaign_id: recipient.campaign_id,
    event_type: event.type,
    resend_event_id: svixId,
    link_url: linkUrl,
    occurred_at: event.created_at,
  });
  if (insertError && insertError.code !== "23505") {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  if (event.type === "email.bounced" || event.type === "email.complained") {
    await supabase.from("email_suppressions").upsert(
      {
        email: recipient.email.toLowerCase(),
        reason: event.type === "email.bounced" ? "bounced" : "complained",
        contact_id: recipient.contact_id,
      },
      { onConflict: "email", ignoreDuplicates: true },
    );
  }

  return Response.json({ received: true });
}
