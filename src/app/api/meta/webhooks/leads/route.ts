import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/meta/graph";
import { enqueueLeadgen, processPendingMetaLeads, type LeadgenNotification } from "@/lib/meta/ingest";

// Webhook de leadgen da Meta. Rotas /api não passam pelo proxy.ts, então a
// autenticação é a própria assinatura do corpo — mesma ideia do webhook do
// Resend em /api/marketing/webhooks/resend.

// Handshake de verificação: a Meta chama com hub.challenge ao salvar a URL no
// painel do app e espera o desafio de volta em texto puro.
export async function GET(request: Request) {
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!expected) {
    return Response.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === expected && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

type LeadgenChange = {
  field?: string;
  value?: {
    leadgen_id?: string;
    form_id?: string;
    page_id?: string;
    created_time?: number;
  };
};

type WebhookPayload = {
  object?: string;
  entry?: { id?: string; time?: number; changes?: LeadgenChange[] }[];
};

export async function POST(request: Request) {
  // A assinatura é sobre o corpo CRU: precisa ler como texto antes do parse.
  const rawBody = await request.text();

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"));
  } catch (err) {
    console.error("[meta-leads] webhook sem configuração de app:", err);
    return Response.json({ error: "Webhook não configurado." }, { status: 500 });
  }
  if (!valid) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Só notificações de página interessam aqui.
  if (payload.object !== "page") return Response.json({ received: true });

  const notifications: LeadgenNotification[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const value = change.value;
      if (!value?.leadgen_id || !value.form_id) continue;
      notifications.push({
        leadgen_id: value.leadgen_id,
        form_id: value.form_id,
        page_id: value.page_id ?? entry.id ?? null,
        created_time: value.created_time ?? null,
      });
    }
  }

  if (!notifications.length) return Response.json({ received: true });

  try {
    await enqueueLeadgen(createAdminClient(), notifications);
  } catch (err) {
    // Devolver erro faz a Meta reenviar, que é o comportamento certo quando
    // não conseguimos nem enfileirar.
    console.error("[meta-leads] falha ao enfileirar leads do webhook:", err);
    return Response.json({ error: "Falha ao enfileirar." }, { status: 500 });
  }

  // A Meta espera resposta rápida e reenvia se demorar: o lead é buscado e
  // convertido em contato depois da resposta, como o kick das automações.
  after(async () => {
    try {
      await processPendingMetaLeads();
    } catch (err) {
      console.error("[meta-leads] falha no processamento pós-webhook:", err);
    }
  });

  return Response.json({ received: true, queued: notifications.length });
}
