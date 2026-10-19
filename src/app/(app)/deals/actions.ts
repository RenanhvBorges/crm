"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { CustomFieldValues } from "@/lib/custom-fields";
import { chunk, parseIds, pluralize, runBulk, type BulkResult } from "@/lib/bulk";
import { isDealStatus, statusForStageName, type DealStatus } from "@/lib/deals";

export async function createDeal(formData: FormData) {
  const supabase = await createClient();

  const contactId = String(formData.get("contact_id") ?? "") || null;
  const valueRaw = String(formData.get("value") ?? "0").replace(",", ".");
  const expectedCloseDate = String(formData.get("expected_close_date") ?? "") || null;

  const { error } = await supabase.from("deals").insert({
    pipeline_id: String(formData.get("pipeline_id")),
    stage_id: String(formData.get("stage_id")),
    contact_id: contactId,
    title: String(formData.get("title") ?? "").trim(),
    value: Number(valueRaw) || 0,
    expected_close_date: expectedCloseDate,
  });

  if (error) {
    throw new Error(error.message);
  }

  kickAutomationProcessor();
  revalidatePath("/deals");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function updateDeal(dealId: string, formData: FormData) {
  const supabase = await createClient();

  const contactId = String(formData.get("contact_id") ?? "") || null;
  const valueRaw = String(formData.get("value") ?? "0").replace(",", ".");
  const expectedCloseDate = String(formData.get("expected_close_date") ?? "") || null;
  const status = String(formData.get("status") ?? "open");
  const isClosed = status === "won" || status === "lost";
  const customFields = JSON.parse(
    String(formData.get("custom_fields") ?? "{}"),
  ) as CustomFieldValues;

  // Salvar um negócio já fechado sem trocar o status não pode mudar a data de
  // fechamento (ela ordena e identifica a lista de ganhos/perdidos).
  const { data: current } = await supabase
    .from("deals")
    .select("status, closed_at")
    .eq("id", dealId)
    .single();
  const closedAt = !isClosed
    ? null
    : current?.status === status && current.closed_at
      ? current.closed_at
      : new Date().toISOString();

  const { error } = await supabase
    .from("deals")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      value: Number(valueRaw) || 0,
      contact_id: contactId,
      expected_close_date: expectedCloseDate,
      pipeline_id: String(formData.get("pipeline_id")),
      stage_id: String(formData.get("stage_id")),
      status,
      closed_at: closedAt,
      custom_fields: customFields,
    })
    .eq("id", dealId);

  if (error) {
    throw new Error(error.message);
  }

  kickAutomationProcessor();
  revalidatePath("/deals");
  revalidatePath("/deals/closed");
  revalidatePath(`/deals/${dealId}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function moveDealStage(dealId: string, stageId: string) {
  const supabase = await createClient();

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("name")
    .eq("id", stageId)
    .single();

  const status = statusForStageName(stage?.name);

  const { error } = await supabase
    .from("deals")
    .update({
      stage_id: stageId,
      status,
      closed_at: status === "open" ? null : new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) {
    throw new Error(error.message);
  }

  kickAutomationProcessor();
  revalidatePath("/deals");
  revalidatePath("/deals/closed");
  revalidatePath("/", "layout");
}

export async function deleteDeal(dealId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("deals").delete().eq("id", dealId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/deals");
  redirect("/deals");
}

// ---------------------------------------------------------------------------
// Ações em massa
// ---------------------------------------------------------------------------

function revalidateDealSurfaces() {
  revalidatePath("/deals");
  revalidatePath("/deals/closed");
  revalidatePath("/contacts");
  revalidatePath("/", "layout");
}

// Aplica um status a vários negócios. A data de fechamento só é (re)carimbada
// em quem de fato mudou de status; quem já estava nesse status a mantém.
async function applyDealStatus(
  ids: string[],
  status: DealStatus,
  extra: { stage_id?: string; pipeline_id?: string } = {},
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  for (const part of chunk(ids)) {
    if (status === "open") {
      const { error } = await supabase
        .from("deals")
        .update({ ...extra, status, closed_at: null })
        .in("id", part);
      if (error) throw new Error(error.message);
      continue;
    }

    const changing = await supabase
      .from("deals")
      .update({ ...extra, status, closed_at: now })
      .in("id", part)
      .neq("status", status);
    if (changing.error) throw new Error(changing.error.message);

    const unchanged = await supabase
      .from("deals")
      .update({ ...extra, status })
      .in("id", part)
      .eq("status", status);
    if (unchanged.error) throw new Error(unchanged.error.message);
  }

  kickAutomationProcessor();
  revalidateDealSurfaces();
}

const STATUS_RESULT: Record<DealStatus, [string, string]> = {
  open: ["negócio reaberto", "negócios reabertos"],
  won: ["negócio marcado como ganho", "negócios marcados como ganhos"],
  lost: ["negócio marcado como perdido", "negócios marcados como perdidos"],
};

export async function bulkSetDealStatus(ids: string[], status: DealStatus): Promise<BulkResult> {
  return runBulk(async () => {
    const dealIds = parseIds(ids);
    if (!isDealStatus(status)) throw new Error("Status inválido.");

    await applyDealStatus(dealIds, status);

    const [singular, plural] = STATUS_RESULT[status];
    return `${pluralize(dealIds.length, singular, plural)}.`;
  });
}

export async function bulkMoveDeals(ids: string[], stageId: string): Promise<BulkResult> {
  return runBulk(async () => {
    const dealIds = parseIds(ids);
    const [validStageId] = parseIds([stageId]);
    const supabase = await createClient();

    const { data: stage, error } = await supabase
      .from("pipeline_stages")
      .select("id, name, pipeline_id")
      .eq("id", validStageId)
      .single();
    if (error || !stage) throw new Error(error?.message ?? "Estágio não encontrado.");

    await applyDealStatus(dealIds, statusForStageName(stage.name), {
      stage_id: stage.id,
      pipeline_id: stage.pipeline_id,
    });

    return `${pluralize(dealIds.length, "negócio movido", "negócios movidos")} para "${stage.name}".`;
  });
}

export async function bulkDeleteDeals(ids: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const dealIds = parseIds(ids);
    const supabase = await createClient();

    let deleted = 0;
    for (const part of chunk(dealIds)) {
      const { error, count } = await supabase
        .from("deals")
        .delete({ count: "exact" })
        .in("id", part);
      if (error) throw new Error(error.message);
      deleted += count ?? 0;
    }

    revalidateDealSurfaces();
    return `${pluralize(deleted, "negócio excluído", "negócios excluídos")}.`;
  });
}
