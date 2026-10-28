import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import { resolvePlaceholdersText } from "@/lib/email-placeholders";
import { resolveRecipients, sendNextChunk } from "@/lib/email-send";
import { enqueueAdConversion } from "@/lib/ad-conversions/enqueue";
import type { FlowNode } from "./flow";

type Admin = SupabaseClient<Database>;
type Contact = Tables<"contacts">;
type Enrollment = Tables<"automation_enrollments">;

export type StepResult =
  | { status: "ok" | "skipped"; detail?: Record<string, unknown> }
  | { status: "error"; error: string };

const FIXED_CONTACT_COLUMNS = new Set(["name", "email", "phone", "company"]);

// Executa um nó de ação. Mutações passam pelas mesmas tabelas da UI, então os
// triggers de automation_events disparam normalmente — automações podem
// encadear outras (a proteção anti-loop fica no engine, na inscrição).
export async function executeNode(
  admin: Admin,
  enrollment: Enrollment,
  node: FlowNode,
  contact: Contact,
  automation: { id: string; name: string },
): Promise<StepResult> {
  switch (node.type) {
    case "add_tag":
    case "remove_tag": {
      const has = contact.tags.includes(node.tag);
      if (node.type === "add_tag" && has) return { status: "skipped", detail: { reason: "já tem a tag" } };
      if (node.type === "remove_tag" && !has)
        return { status: "skipped", detail: { reason: "não tem a tag" } };
      const tags =
        node.type === "add_tag"
          ? [...contact.tags, node.tag]
          : contact.tags.filter((t) => t !== node.tag);
      const { error } = await admin.from("contacts").update({ tags }).eq("id", contact.id);
      if (error) return { status: "error", error: error.message };
      return { status: "ok", detail: { tag: node.tag } };
    }

    case "add_to_list": {
      const { error } = await admin
        .from("contact_list_members")
        .upsert(
          { list_id: node.listId, contact_id: contact.id },
          { onConflict: "list_id,contact_id", ignoreDuplicates: true },
        );
      if (error) return { status: "error", error: error.message };
      return { status: "ok", detail: { list_id: node.listId } };
    }

    case "remove_from_list": {
      const { error } = await admin
        .from("contact_list_members")
        .delete()
        .eq("list_id", node.listId)
        .eq("contact_id", contact.id);
      if (error) return { status: "error", error: error.message };
      return { status: "ok", detail: { list_id: node.listId } };
    }

    case "create_task": {
      const dueDate =
        node.dueInDays === null
          ? null
          : new Date(Date.now() + node.dueInDays * 86_400_000).toISOString().slice(0, 10);
      const context = enrollment.context as Record<string, unknown>;
      const contextDeal = (context.deal ?? null) as { id?: string } | null;
      const { error } = await admin.from("tasks").insert({
        title: resolvePlaceholdersText(node.title, contact),
        description: node.description || null,
        due_date: dueDate,
        contact_id: contact.id,
        deal_id: contextDeal?.id ?? null,
        assigned_to: node.assignedTo,
      });
      if (error) return { status: "error", error: error.message };
      return { status: "ok" };
    }

    case "create_deal": {
      const { error } = await admin.from("deals").insert({
        title: resolvePlaceholdersText(node.title, contact),
        pipeline_id: node.pipelineId,
        stage_id: node.stageId,
        value: node.value,
        contact_id: contact.id,
        status: "open",
      });
      if (error) return { status: "error", error: error.message };
      return { status: "ok" };
    }

    case "move_deal_stage": {
      const deal = await resolveTargetDeal(admin, enrollment, contact);
      if (!deal) return { status: "skipped", detail: { reason: "contato sem negócio aberto" } };
      const { data: stage } = await admin
        .from("pipeline_stages")
        .select("pipeline_id")
        .eq("id", node.stageId)
        .single();
      if (!stage) return { status: "error", error: "Estágio de destino não existe mais." };
      const { error } = await admin
        .from("deals")
        .update({ stage_id: node.stageId, pipeline_id: stage.pipeline_id })
        .eq("id", deal.id);
      if (error) return { status: "error", error: error.message };
      return { status: "ok", detail: { deal_id: deal.id, stage_id: node.stageId } };
    }

    case "set_deal_status": {
      const deal = await resolveTargetDeal(admin, enrollment, contact);
      if (!deal) return { status: "skipped", detail: { reason: "contato sem negócio aberto" } };
      const closed = node.dealStatus === "won" || node.dealStatus === "lost";
      const { error } = await admin
        .from("deals")
        .update({
          status: node.dealStatus,
          closed_at: closed ? new Date().toISOString() : null,
        })
        .eq("id", deal.id);
      if (error) return { status: "error", error: error.message };
      return { status: "ok", detail: { deal_id: deal.id, deal_status: node.dealStatus } };
    }

    case "update_contact_field": {
      if (node.fieldSource === "fixed") {
        if (!FIXED_CONTACT_COLUMNS.has(node.key)) {
          return { status: "error", error: `Campo fixo inválido: ${node.key}` };
        }
        const updates =
          node.key === "name"
            ? { name: node.value }
            : node.key === "email"
              ? { email: node.value || null }
              : node.key === "phone"
                ? { phone: node.value || null }
                : { company: node.value || null };
        const { error } = await admin.from("contacts").update(updates).eq("id", contact.id);
        if (error) return { status: "error", error: error.message };
        return { status: "ok", detail: { key: node.key } };
      }
      const customValues = (contact.custom_fields as Record<string, unknown> | null) ?? {};
      const { error } = await admin
        .from("contacts")
        .update({ custom_fields: { ...customValues, [node.key]: node.value } as Json })
        .eq("id", contact.id);
      if (error) return { status: "error", error: error.message };
      return { status: "ok", detail: { key: node.key } };
    }

    case "send_email": {
      // Estratégia: cria uma campanha "de sistema" com um único destinatário.
      // Assim o e-mail herda todo o pipeline existente — rodapé de descadastro,
      // webhook do Resend, supressões e métricas — sem um caminho de envio novo.
      if (!contact.email) {
        return { status: "skipped", detail: { reason: "contato sem e-mail" } };
      }
      const { data: suppressed } = await admin
        .from("email_suppressions")
        .select("id")
        .eq("email", contact.email.toLowerCase())
        .maybeSingle();
      if (suppressed) {
        return { status: "skipped", detail: { reason: "e-mail suprimido (descadastro/bounce)" } };
      }

      const { data: template } = await admin
        .from("email_templates")
        .select("subject, content")
        .eq("id", node.templateId)
        .maybeSingle();
      if (!template) return { status: "error", error: "Template de e-mail não existe mais." };

      const { data: fieldDefs } = await admin
        .from("custom_field_definitions")
        .select("*")
        .eq("entity", "contact");
      const subject = resolvePlaceholdersText(
        node.subject || template.subject || "",
        contact,
        fieldDefs ?? [],
      );
      if (!subject.trim()) {
        return { status: "error", error: "Template sem assunto — defina no template ou no passo." };
      }

      const { data: campaign, error } = await admin
        .from("email_campaigns")
        .insert({
          name: `[Automação] ${automation.name}`,
          subject,
          content: template.content,
          template_id: node.templateId,
          audience_type: "contact",
          audience_contact_id: contact.id,
          is_system: true,
          status: "scheduled",
          scheduled_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) return { status: "error", error: error.message };

      // Envio imediato best-effort (mesma ordem do cron de campanhas). Se
      // falhar — limite diário do Resend, indisponibilidade — a campanha fica
      // scheduled/sending e o cron de campanhas assume no próximo tick.
      let deliveredInline = false;
      try {
        await admin.from("email_campaigns").update({ status: "sending" }).eq("id", campaign.id);
        await resolveRecipients(campaign.id);
        const result = await sendNextChunk(campaign.id);
        if (result.remaining === 0) {
          await admin
            .from("email_campaigns")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", campaign.id);
          deliveredInline = true;
        }
      } catch (err) {
        console.warn(
          `[automations] envio inline falhou (campanha ${campaign.id}), cron assume:`,
          err instanceof Error ? err.message : err,
        );
      }

      return { status: "ok", detail: { campaign_id: campaign.id, delivered_inline: deliveredInline } };
    }

    case "webhook": {
      try {
        const response = await fetch(node.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            automation_id: automation.id,
            automation_name: automation.name,
            node_id: node.id,
            contact,
            context: enrollment.context,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          return { status: "error", error: `Webhook respondeu ${response.status}.` };
        }
        return { status: "ok", detail: { response_status: response.status } };
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : "Falha ao chamar o webhook.",
        };
      }
    }

    case "send_ad_conversion": {
      return enqueueAdConversion(admin, {
        conversionId: node.conversionId,
        contact,
        deal: await resolveTargetDeal(admin, enrollment, contact),
        automationId: automation.id,
        enrollmentId: enrollment.id,
      });
    }

    case "wait":
    case "condition":
      // Tratados pelo engine, nunca chegam aqui.
      return { status: "error", error: `Nó ${node.type} não é uma ação executável.` };
  }
}

// Negócio-alvo das ações de venda: o negócio do evento que originou a
// inscrição, ou o negócio aberto mais recente do contato.
async function resolveTargetDeal(
  admin: Admin,
  enrollment: Enrollment,
  contact: Contact,
): Promise<{ id: string; value: number } | null> {
  const context = enrollment.context as Record<string, unknown>;
  const contextDeal = (context.deal ?? null) as { id?: string } | null;
  if (contextDeal?.id) {
    const { data } = await admin
      .from("deals")
      .select("id, value")
      .eq("id", contextDeal.id)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await admin
    .from("deals")
    .select("id, value")
    .eq("contact_id", contact.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
