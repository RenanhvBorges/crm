import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AudiencePicker } from "@/components/audience-picker";
import { PlaceholderTextInput } from "@/components/placeholder-text-input";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { parseEmailDocument } from "@/lib/email-blocks";
import { listAvailablePlaceholders } from "@/lib/email-placeholders";
import { updateCampaignDetails, updateCampaignAudience, deleteCampaign } from "../actions";
import { CampaignEditorClient } from "./campaign-editor-client";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: campaign },
    { data: contacts },
    { data: lists },
    { data: recipients },
    { data: fieldDefs },
  ] = await Promise.all([
    supabase.from("email_campaigns").select("*").eq("id", id).single(),
    supabase.from("contacts").select("id, name, email").order("name"),
    supabase.from("contact_lists").select("id, name").order("sort_order"),
    supabase
      .from("email_campaign_recipients")
      .select("status, opened_at, clicked_at")
      .eq("campaign_id", id),
    supabase.from("custom_field_definitions").select("*").eq("entity", "contact"),
  ]);

  if (!campaign) notFound();

  const stats = {
    total: recipients?.length ?? 0,
    sent: (recipients ?? []).filter((r) => r.status !== "pending" && r.status !== "suppressed")
      .length,
    opened: (recipients ?? []).filter((r) => r.opened_at).length,
    clicked: (recipients ?? []).filter((r) => r.clicked_at).length,
    bounced: (recipients ?? []).filter((r) => r.status === "bounced").length,
    suppressed: (recipients ?? []).filter((r) => r.status === "suppressed").length,
  };

  const updateDetails = updateCampaignDetails.bind(null, id);
  const updateAudience = updateCampaignAudience.bind(null, id);
  const placeholderOptions = listAvailablePlaceholders(fieldDefs ?? []);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{campaign.name}</h1>
        <DeleteFieldButton
          fieldId={campaign.id}
          deleteAction={deleteCampaign}
          confirmMessage="Excluir esta campanha?"
        />
      </div>

      <section className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg-2">Detalhes</h2>
        <form action={updateDetails} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">
              Nome da campanha
            </label>
            <input
              name="name"
              defaultValue={campaign.name}
              required
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">Assunto</label>
            <PlaceholderTextInput
              name="subject"
              defaultValue={campaign.subject}
              required
              placeholders={placeholderOptions}
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-border-1 px-3 py-1.5 text-sm text-fg-2 hover:bg-bg-surface-2"
          >
            Salvar
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg-2">Público</h2>
        <form action={updateAudience} className="space-y-3">
          <AudiencePicker
            contacts={(contacts ?? []).map((c) => ({
              id: c.id,
              label: c.email ? `${c.name} (${c.email})` : c.name,
            }))}
            lists={(lists ?? []).map((l) => ({ id: l.id, label: l.name }))}
            defaultType={campaign.audience_type as "contact" | "list"}
            defaultContactId={campaign.audience_contact_id}
            defaultListId={campaign.audience_list_id}
          />
          <button
            type="submit"
            disabled={campaign.status !== "draft"}
            className="rounded-md border border-border-1 px-3 py-1.5 text-sm text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
          >
            Salvar público
          </button>
          {campaign.status !== "draft" ? (
            <p className="text-xs text-fg-muted">
              O público só pode ser alterado enquanto a campanha é um rascunho.
            </p>
          ) : null}
        </form>
      </section>

      <CampaignEditorClient
        campaignId={campaign.id}
        status={campaign.status}
        scheduledAt={campaign.scheduled_at}
        initialContent={parseEmailDocument(campaign.content)}
        placeholders={placeholderOptions}
        stats={stats}
      />
    </div>
  );
}
