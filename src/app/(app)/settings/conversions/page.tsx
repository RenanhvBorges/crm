import { createClient } from "@/lib/supabase/server";
import { parseGoogleAdsConfig, parseMetaConfig } from "@/lib/ad-conversions/config";
import { IntegrationsPanel } from "./integrations-panel";
import { ConversionsPanel } from "./conversions-panel";
import { UploadsPanel, type UploadRow } from "./uploads-panel";

export default async function ConversionsSettingsPage() {
  const supabase = await createClient();

  // src/proxy.ts já garante uma sessão autenticada em qualquer rota fora de
  // /login, então user nunca é null aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: integrations }, { data: conversions }, { data: uploads }, { data: profile }] =
    await Promise.all([
      supabase.from("ad_integrations").select("*"),
      supabase.from("ad_conversions").select("*").order("name"),
      supabase
        .from("ad_conversion_uploads")
        .select(
          "id, platform, status, attempts, value, currency, last_error, created_at, sent_at, conversion:ad_conversions(name), contact:contacts(id, name)",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
    ]);

  const isDirector = profile?.role === "diretor_comercial";
  const google = integrations?.find((i) => i.platform === "google_ads");
  const meta = integrations?.find((i) => i.platform === "meta");

  const uploadRows: UploadRow[] = (uploads ?? []).map((u) => ({
    id: u.id,
    platform: u.platform,
    status: u.status,
    attempts: u.attempts,
    value: u.value,
    currency: u.currency,
    last_error: u.last_error,
    created_at: u.created_at,
    conversionName: u.conversion?.name ?? "Conversão excluída",
    contact: u.contact ? { id: u.contact.id, name: u.contact.name } : null,
  }));

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl">Conversões offline</h1>
        <p className="text-sm text-fg-3">
          Devolva ao Google Ads e à Meta os marcos que acontecem no CRM (lead qualificado, reunião,
          venda), para as campanhas otimizarem pelo que vira negócio. O envio é feito pelo passo
          &quot;Enviar conversão offline&quot; das automações.
        </p>
      </div>

      <IntegrationsPanel
        isDirector={isDirector}
        google={{
          isActive: google?.is_active ?? false,
          secretHint: google?.secret_hint ?? null,
          lastTestAt: google?.last_test_at ?? null,
          lastTestOk: google?.last_test_ok ?? null,
          lastTestMessage: google?.last_test_message ?? null,
          config: parseGoogleAdsConfig(google?.config),
        }}
        meta={{
          isActive: meta?.is_active ?? false,
          secretHint: meta?.secret_hint ?? null,
          lastTestAt: meta?.last_test_at ?? null,
          lastTestOk: meta?.last_test_ok ?? null,
          lastTestMessage: meta?.last_test_message ?? null,
          config: parseMetaConfig(meta?.config),
        }}
      />

      <ConversionsPanel conversions={conversions ?? []} />

      <UploadsPanel uploads={uploadRows} />
    </div>
  );
}
