"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CustomFieldValues } from "@/lib/custom-fields";

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
      closed_at: isClosed ? new Date().toISOString() : null,
      custom_fields: customFields,
    })
    .eq("id", dealId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/deals");
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

  const normalizedName = stage?.name?.toLowerCase() ?? "";
  const isWon = normalizedName.includes("ganho");
  const isLost = normalizedName.includes("perdido");

  const { error } = await supabase
    .from("deals")
    .update({
      stage_id: stageId,
      status: isWon ? "won" : isLost ? "lost" : "open",
      closed_at: isWon || isLost ? new Date().toISOString() : null,
    })
    .eq("id", dealId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/deals");
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
