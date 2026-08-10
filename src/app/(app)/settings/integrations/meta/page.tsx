import { createClient } from "@/lib/supabase/server";
import { oauthRedirectUri } from "@/lib/meta/connect";
import { MetaClient, type ConnectionRow, type LeadFormRow, type LeadRow } from "./meta-client";

export default async function MetaIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; choose?: string }>;
}) {
  const { connected, error } = await searchParams;
  const supabase = await createClient();

  // Nunca selecionar page_access_token aqui: este resultado atravessa a
  // fronteira para o componente client.
  const { data: connections } = await supabase
    .from("meta_connections")
    .select(
      "id, page_id, page_name, is_active, default_list_id, default_tags, webhook_subscribed_at, last_synced_at",
    )
    .order("created_at");

  const active = (connections ?? []).find((c) => c.is_active) ?? null;

  const [{ data: forms }, { data: lists }, { data: fields }, { data: leads }] = await Promise.all([
    active
      ? supabase
          .from("meta_lead_forms")
          .select(
            "id, form_id, name, status, is_enabled, target_list_id, tags, field_mappings, questions, last_polled_at",
          )
          .eq("connection_id", active.id)
          .order("name")
      : Promise.resolve({ data: [] as LeadFormRow[] }),
    supabase.from("contact_lists").select("id, name").order("sort_order"),
    supabase
      .from("custom_field_definitions")
      .select("key, label")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase
      .from("meta_leads")
      .select("id, leadgen_id, form_id, status, error_message, created_at, contact_id, contacts(name)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const formNames = new Map((forms ?? []).map((f) => [f.form_id, f.name]));

  const history: LeadRow[] = (leads ?? []).map((lead) => ({
    id: lead.id,
    leadgen_id: lead.leadgen_id,
    formName: formNames.get(lead.form_id) ?? lead.form_id,
    status: lead.status,
    error_message: lead.error_message,
    created_at: lead.created_at,
    contactId: lead.contact_id,
    contactName: lead.contacts?.name ?? null,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl">Meta Ads</h1>
      <p className="mb-6 text-sm text-fg-3">
        Leads dos formulários instantâneos entram no CRM sozinhos, viram contato e caem na lista
        configurada aqui.
      </p>

      <MetaClient
        connections={(connections ?? []) as ConnectionRow[]}
        forms={(forms ?? []) as LeadFormRow[]}
        lists={lists ?? []}
        customFields={fields ?? []}
        leads={history}
        callbackUrl={`${oauthRedirectUri().replace("/api/meta/oauth/callback", "")}/api/meta/webhooks/leads`}
        env={{
          app: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
          verifyToken: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
        }}
        notice={{ connected: connected ?? null, error: error ?? null }}
      />
    </div>
  );
}
