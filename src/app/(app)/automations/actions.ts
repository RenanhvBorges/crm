"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flowSchema, parseFlow, validateFlow, type Flow } from "@/lib/automations/flow";
import { triggerDefinition, type TriggerConfig } from "@/lib/automations/triggers";
import type { Json } from "@/lib/supabase/database.types";

// Monta o trigger_config a partir dos campos condicionais do formulário,
// gravando só o que faz sentido para o tipo de gatilho escolhido.
function parseTriggerFromFormData(formData: FormData) {
  const triggerType = String(formData.get("trigger_type") ?? "");
  const def = triggerDefinition(triggerType);
  if (!def) throw new Error("Selecione um gatilho válido.");

  const config: TriggerConfig = {};
  switch (def.configKind) {
    case "tag": {
      const tag = String(formData.get("trigger_tag") ?? "").trim();
      if (tag) config.tag = tag;
      break;
    }
    case "list": {
      const listId = String(formData.get("trigger_list_id") ?? "");
      if (listId) config.listId = listId;
      break;
    }
    case "pipeline": {
      const pipelineId = String(formData.get("trigger_pipeline_id") ?? "");
      if (pipelineId) config.pipelineId = pipelineId;
      break;
    }
    case "pipeline_stage": {
      const pipelineId = String(formData.get("trigger_pipeline_id") ?? "");
      const stageId = String(formData.get("trigger_stage_id") ?? "");
      if (pipelineId) config.pipelineId = pipelineId;
      if (stageId) config.stageId = stageId;
      break;
    }
    case "campaign": {
      const campaignId = String(formData.get("trigger_campaign_id") ?? "");
      if (campaignId) config.campaignId = campaignId;
      break;
    }
    case "score": {
      const mode = String(formData.get("trigger_score_mode") ?? "any");
      config.mode =
        mode === "crosses_above" || mode === "crosses_below" ? mode : "any";
      if (config.mode !== "any") {
        const value = Number(formData.get("trigger_score_value") ?? "");
        if (!Number.isFinite(value)) throw new Error("Informe o limiar de score.");
        config.value = value;
      }
      break;
    }
  }

  return { trigger_type: triggerType, trigger_config: config as Json };
}

export async function createAutomation(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe um nome para a automação.");

  const trigger = parseTriggerFromFormData(formData);

  const { data, error } = await supabase
    .from("automations")
    .insert({ name, ...trigger })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/automations");
  redirect(`/automations/${data.id}`);
}

export async function updateAutomationFlow(id: string, flow: Flow) {
  const parsed = flowSchema.safeParse(flow);
  if (!parsed.success) throw new Error("Fluxo de automação inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .update({ flow: parsed.data as unknown as Json })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/automations/${id}`);
}

export async function updateAutomationSettings(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe um nome para a automação.");
  const allowReentry = formData.get("allow_reentry") === "on";

  const trigger = parseTriggerFromFormData(formData);

  const { error } = await supabase
    .from("automations")
    .update({ name, allow_reentry: allowReentry, ...trigger })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/automations/${id}`);
  revalidatePath("/automations");
}

export async function setAutomationStatus(id: string, status: "active" | "paused" | "draft") {
  const supabase = await createClient();

  if (status === "active") {
    const { data: automation } = await supabase
      .from("automations")
      .select("flow")
      .eq("id", id)
      .single();
    if (!automation) throw new Error("Automação não encontrada.");
    const errors = validateFlow(parseFlow(automation.flow));
    if (errors.length) throw new Error(errors[0]);
  }

  const { error } = await supabase.from("automations").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/automations/${id}`);
  revalidatePath("/automations");
}

export async function duplicateAutomation(id: string) {
  const supabase = await createClient();

  const { data: original, error: fetchError } = await supabase
    .from("automations")
    .select("name, trigger_type, trigger_config, flow, allow_reentry")
    .eq("id", id)
    .single();
  if (fetchError || !original) throw new Error(fetchError?.message ?? "Automação não encontrada.");

  const { data, error } = await supabase
    .from("automations")
    .insert({ ...original, name: `${original.name} (cópia)` })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/automations");
  redirect(`/automations/${data.id}`);
}

export async function deleteAutomation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/automations");
}

export async function cancelEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_enrollments")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", enrollmentId)
    .in("status", ["running", "waiting"]);
  if (error) throw new Error(error.message);
}
