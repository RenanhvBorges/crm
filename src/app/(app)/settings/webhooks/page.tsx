import { createClient } from "@/lib/supabase/server";
import { WebhooksClient, type WebhookRow } from "./webhooks-client";

export default async function WebhooksPage() {
  const supabase = await createClient();

  const [{ data: subscriptions }, { data: deliveries }] = await Promise.all([
    supabase.from("webhook_subscriptions").select("*").order("created_at", { ascending: false }),
    supabase.from("webhook_deliveries").select("subscription_id, status"),
  ]);

  const counts = new Map<string, WebhookRow["deliveries"]>();
  for (const d of deliveries ?? []) {
    const cur = counts.get(d.subscription_id) ?? { success: 0, pending: 0, failed: 0 };
    if (d.status === "success") cur.success += 1;
    else if (d.status === "failed") cur.failed += 1;
    else cur.pending += 1;
    counts.set(d.subscription_id, cur);
  }

  const webhooks: WebhookRow[] = (subscriptions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    secret: s.secret,
    events: s.events,
    is_active: s.is_active,
    deliveries: counts.get(s.id) ?? { success: 0, pending: 0, failed: 0 },
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl">Webhooks de saída</h1>
      <p className="mb-6 text-sm text-fg-3">
        Envie eventos do CRM para sistemas externos, como o n8n, assim que acontecerem.
      </p>

      <WebhooksClient webhooks={webhooks} />

      <div className="mt-6 rounded-lg border border-border-1 bg-oxford-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg-2">Como verificar a assinatura</h2>
        <p className="text-sm text-fg-3">
          Cada entrega chega por <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">POST</code>{" "}
          com o corpo{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">
            {"{ id, event_id, type, created_at, data }"}
          </code>{" "}
          e os cabeçalhos{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">X-Oxford-Event</code>,{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">X-Oxford-Timestamp</code> e{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">X-Oxford-Signature</code>.
        </p>
        <p className="mt-2 text-sm text-fg-3">
          A assinatura é{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">
            sha256=HMAC_SHA256(segredo, timestamp + &quot;.&quot; + corpo)
          </code>
          . Rejeite entregas cujo timestamp esteja a mais de 5 minutos do horário atual.
        </p>
        <p className="mt-2 text-sm text-fg-3">
          Falhas são reenviadas 5 vezes (1 min, 5 min, 30 min, 2 h e 12 h). Responder com status
          2xx encerra a entrega.
        </p>
      </div>
    </div>
  );
}
