"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_EMAIL_DOCUMENT, emailDocumentSchema, type EmailDocument } from "@/lib/email-blocks";
import type { Json } from "@/lib/supabase/database.types";

function parseAudience(formData: FormData) {
  const audienceType = String(formData.get("audience_type") ?? "");
  const audienceContactId = String(formData.get("audience_contact_id") ?? "") || null;
  const audienceListId = String(formData.get("audience_list_id") ?? "") || null;

  if (audienceType !== "contact" && audienceType !== "list") {
    throw new Error("Selecione o público da campanha.");
  }
  if (audienceType === "contact" && !audienceContactId) {
    throw new Error("Selecione um contato.");
  }
  if (audienceType === "list" && !audienceListId) {
    throw new Error("Selecione uma lista.");
  }

  return {
    audience_type: audienceType,
    audience_contact_id: audienceType === "contact" ? audienceContactId : null,
    audience_list_id: audienceType === "list" ? audienceListId : null,
  };
}

export async function createCampaign(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "") || null;
  if (!name) throw new Error("Informe um nome para a campanha.");
  if (!subject) throw new Error("Informe um assunto.");

  const audience = parseAudience(formData);

  let content: EmailDocument = EMPTY_EMAIL_DOCUMENT;
  if (templateId) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("content")
      .eq("id", templateId)
      .single();
    if (template) {
      const parsed = emailDocumentSchema.safeParse(template.content);
      if (parsed.success) content = parsed.data;
    }
  }

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      name,
      subject,
      ...audience,
      template_id: templateId,
      content: content as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/marketing/campaigns");
  redirect(`/marketing/campaigns/${data.id}`);
}

export async function updateCampaignDetails(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!name) throw new Error("Informe um nome para a campanha.");
  if (!subject) throw new Error("Informe um assunto.");

  const { error } = await supabase
    .from("email_campaigns")
    .update({ name, subject, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/marketing/campaigns/${id}`);
  revalidatePath("/marketing/campaigns");
}

export async function updateCampaignContent(id: string, document: EmailDocument) {
  const parsed = emailDocumentSchema.safeParse(document);
  if (!parsed.success) throw new Error("Conteúdo do e-mail inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      content: parsed.data as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/marketing/campaigns/${id}`);
}

export async function updateCampaignAudience(id: string, formData: FormData) {
  const supabase = await createClient();
  const audience = parseAudience(formData);

  const { error } = await supabase
    .from("email_campaigns")
    .update({ ...audience, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/marketing/campaigns/${id}`);
}

// "Enviar agora" e "Agendar" convergem no mesmo campo: scheduled_at = now()
// para envio imediato. O cron (/api/marketing/cron/process-campaigns) é quem
// de fato resolve destinatários e despacha — aqui só marcamos a intenção.
export async function sendCampaignNow(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "scheduled", scheduled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/marketing/campaigns/${id}`);
  revalidatePath("/marketing/campaigns");
}

export async function scheduleCampaign(id: string, formData: FormData) {
  const supabase = await createClient();
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  if (!scheduledAt) throw new Error("Escolha uma data/hora.");
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  if (date.getTime() < Date.now()) throw new Error("Escolha uma data no futuro.");

  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "scheduled", scheduled_at: date.toISOString() })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/marketing/campaigns/${id}`);
  revalidatePath("/marketing/campaigns");
}

export async function cancelSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "draft", scheduled_at: null })
    .eq("id", id)
    .eq("status", "scheduled");
  if (error) throw new Error(error.message);
  revalidatePath(`/marketing/campaigns/${id}`);
  revalidatePath("/marketing/campaigns");
}

export async function duplicateCampaign(id: string) {
  const supabase = await createClient();
  const { data: original, error: fetchError } = await supabase
    .from("email_campaigns")
    .select("name, subject, content, audience_type, audience_contact_id, audience_list_id")
    .eq("id", id)
    .single();
  if (fetchError || !original) throw new Error(fetchError?.message ?? "Campanha não encontrada.");

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ ...original, name: `${original.name} (cópia)` })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/marketing/campaigns");
  redirect(`/marketing/campaigns/${data.id}`);
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("status")
    .eq("id", id)
    .single();
  if (campaign?.status === "sending") {
    throw new Error("Não é possível excluir: a campanha está sendo enviada agora.");
  }

  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/marketing/campaigns");
  redirect("/marketing/campaigns");
}
