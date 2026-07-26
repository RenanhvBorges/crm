"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPipeline(formData: FormData) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("pipelines")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("pipelines").insert({
    name: String(formData.get("name") ?? "").trim(),
    is_default: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/deals/pipelines");
}

export async function deletePipeline(pipelineId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pipelines").delete().eq("id", pipelineId);

  if (error) {
    throw new Error(
      "Não é possível excluir: este funil ainda tem estágios ou negócios vinculados.",
    );
  }

  revalidatePath("/deals/pipelines");
}

export async function createStage(formData: FormData) {
  const supabase = await createClient();
  const pipelineId = String(formData.get("pipeline_id"));

  const { count } = await supabase
    .from("pipeline_stages")
    .select("*", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);

  const { error } = await supabase.from("pipeline_stages").insert({
    pipeline_id: pipelineId,
    name: String(formData.get("name") ?? "").trim(),
    color: String(formData.get("color") ?? "#263fa3"),
    sort_order: count ?? 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/deals/pipelines");
}

export async function deleteStage(stageId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);

  if (error) {
    throw new Error("Não é possível excluir: há negócios neste estágio.");
  }

  revalidatePath("/deals/pipelines");
}
