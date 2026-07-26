import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  getResendClient,
  getSenderAddress,
  RESEND_BATCH_MAX,
  RESEND_FREE_DAILY_LIMIT,
} from "@/lib/resend";
import { parseEmailDocument, renderBlocksToHtml } from "@/lib/email-blocks";
import { resolveContactPlaceholders } from "@/lib/email-placeholders";
import { unsubscribeUrl } from "@/lib/unsubscribe-token";
import type { CustomFieldDefinition } from "@/lib/custom-fields";

type AdminClient = SupabaseClient<Database>;

// Expande a audiência da campanha (contato único ou lista) em linhas
// email_campaign_recipients (status 'pending'), pulando quem já está na
// lista de supressão. Idempotente: reexecutar não duplica linhas (unique
// campaign_id+contact_id) nem reprocessa quem já foi resolvido.
export async function resolveRecipients(campaignId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select("id, audience_type, audience_contact_id, audience_list_id")
    .eq("id", campaignId)
    .single();
  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "Campanha não encontrada.");
  }

  let contactIds: string[];
  if (campaign.audience_type === "contact") {
    contactIds = campaign.audience_contact_id ? [campaign.audience_contact_id] : [];
  } else {
    const { data: members } = await supabase
      .from("contact_list_members")
      .select("contact_id")
      .eq("list_id", campaign.audience_list_id!);
    contactIds = (members ?? []).map((m) => m.contact_id);
  }
  if (!contactIds.length) return;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email")
    .in("id", contactIds);

  const withEmail = (contacts ?? []).filter(
    (c): c is { id: string; email: string } => !!c.email,
  );
  const emails = withEmail.map((c) => c.email.toLowerCase());
  const { data: suppressions } = emails.length
    ? await supabase.from("email_suppressions").select("email").in("email", emails)
    : { data: [] as { email: string }[] };
  const suppressed = new Set((suppressions ?? []).map((s) => s.email));

  const rows = withEmail.map((c) => ({
    campaign_id: campaignId,
    contact_id: c.id,
    email: c.email,
    status: suppressed.has(c.email.toLowerCase()) ? "suppressed" : "pending",
  }));
  if (!rows.length) return;

  const { error } = await supabase
    .from("email_campaign_recipients")
    .upsert(rows, { onConflict: "campaign_id,contact_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

type SendResult = { sent: number; remaining: number };

async function countPending(supabase: AdminClient, campaignId: string): Promise<number> {
  const { count } = await supabase
    .from("email_campaign_recipients")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  return count ?? 0;
}

function appendUnsubscribeFooter(html: string, url: string): string {
  const footer = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 24px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;">Não deseja mais receber estes e-mails? <a href="${url}" style="color:#6b7280;">Cancelar inscrição</a></td></tr></table>`;
  return html.includes("</body>") ? html.replace("</body>", `${footer}</body>`) : html + footer;
}

// Pega até 100 destinatários 'pending' (respeitando o teto diário de 100
// e-mails do plano gratuito da Resend), renderiza o HTML por destinatário
// (blocos -> placeholders -> rodapé de descadastro), envia em lote e
// atualiza o status. Chamado repetidamente pelo cron até esgotar os
// pendentes de uma campanha.
export async function sendNextChunk(campaignId: string): Promise<SendResult> {
  const supabase = createAdminClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select("id, subject, content, from_email, from_name")
    .eq("id", campaignId)
    .single();
  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "Campanha não encontrada.");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("email_campaign_recipients")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", startOfDay.toISOString());

  const dailyBudget = Math.max(0, RESEND_FREE_DAILY_LIMIT - (sentToday ?? 0));
  if (dailyBudget === 0) {
    return { sent: 0, remaining: await countPending(supabase, campaignId) };
  }

  const batchSize = Math.min(RESEND_BATCH_MAX, dailyBudget);
  const { data: recipients, error: recipientsError } = await supabase
    .from("email_campaign_recipients")
    .select("id, email, contact_id")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(batchSize);
  if (recipientsError) throw new Error(recipientsError.message);
  if (!recipients?.length) return { sent: 0, remaining: 0 };

  const contactIds = recipients
    .map((r) => r.contact_id)
    .filter((id): id is string => !!id);
  const [{ data: contacts }, { data: fieldDefs }] = await Promise.all([
    contactIds.length
      ? supabase.from("contacts").select("*").in("id", contactIds)
      : Promise.resolve({ data: [] }),
    supabase.from("custom_field_definitions").select("*").eq("entity", "contact"),
  ]);
  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));
  const doc = parseEmailDocument(campaign.content);
  const baseHtml = renderBlocksToHtml(doc);

  const from = campaign.from_email
    ? campaign.from_name
      ? `${campaign.from_name} <${campaign.from_email}>`
      : campaign.from_email
    : getSenderAddress();

  const payload = recipients.map((r) => {
    const contact = r.contact_id ? contactById.get(r.contact_id) : undefined;
    const withFooter = appendUnsubscribeFooter(baseHtml, unsubscribeUrl(r.id));
    const html = contact
      ? resolveContactPlaceholders(withFooter, contact, (fieldDefs ?? []) as CustomFieldDefinition[])
      : withFooter;
    return { from, to: [r.email], subject: campaign.subject, html };
  });

  const resend = getResendClient();
  const { data: batchResult, error: sendError } = await resend.batch.send(payload);

  if (sendError) {
    await supabase
      .from("email_campaign_recipients")
      .update({ status: "failed", error_message: sendError.message })
      .in(
        "id",
        recipients.map((r) => r.id),
      );
    throw new Error(sendError.message);
  }

  const now = new Date().toISOString();
  await Promise.all(
    recipients.map((r, i) =>
      supabase
        .from("email_campaign_recipients")
        .update({
          status: "sent",
          sent_at: now,
          resend_email_id: batchResult?.data?.[i]?.id ?? null,
        })
        .eq("id", r.id),
    ),
  );

  return { sent: recipients.length, remaining: await countPending(supabase, campaignId) };
}
