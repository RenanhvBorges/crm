"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import { chunk, parseIds, pluralize, runBulk, type BulkResult } from "@/lib/bulk";

const DEFAULT_COLOR = "#263fa3";

function revalidateTagSurfaces() {
  revalidatePath("/contacts/tags");
  revalidatePath("/contacts");
}

export async function createTag(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_COLOR;

  if (!name) {
    throw new Error("Informe um nome para a tag.");
  }

  const { error } = await supabase.from("tags").insert({ name, color });

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe uma tag chamada "${name}".`);
    }
    throw new Error(error.message);
  }

  revalidateTagSurfaces();
}

// Cria uma tag no catálogo a partir do seletor do contato.
// Idempotente: se já existir, retorna a existente.
export async function createTagFromPicker(
  name: string,
): Promise<{ name: string; color: string }> {
  const supabase = await createClient();
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Informe um nome para a tag.");
  }

  const { data: existing } = await supabase
    .from("tags")
    .select("name, color")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, color: DEFAULT_COLOR })
    .select("name, color")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/tags");
  return data;
}

export async function updateTag(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_COLOR;

  if (!name) {
    throw new Error("Informe um nome para a tag.");
  }

  const { data: current, error: fetchError } = await supabase
    .from("tags")
    .select("name")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message ?? "Tag não encontrada.");
  }

  const { error } = await supabase.from("tags").update({ name, color }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe uma tag chamada "${name}".`);
    }
    throw new Error(error.message);
  }

  // Propaga o novo nome para os contatos que usam a tag.
  if (current.name !== name) {
    const { error: syncError } = await supabase.rpc("rename_contact_tag", {
      old_name: current.name,
      new_name: name,
    });
    if (syncError) {
      throw new Error(syncError.message);
    }
    kickAutomationProcessor();
  }

  revalidateTagSurfaces();
}

export async function deleteTag(id: string) {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("tags")
    .select("name")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message ?? "Tag não encontrada.");
  }

  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // Remove a tag dos contatos que a possuem.
  const { error: syncError } = await supabase.rpc("remove_contact_tag", {
    tag_name: current.name,
  });
  if (syncError) {
    throw new Error(syncError.message);
  }

  kickAutomationProcessor();
  revalidateTagSurfaces();
}

// ---------------------------------------------------------------------------
// Ações em massa
// ---------------------------------------------------------------------------

export async function bulkDeleteTags(ids: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const tagIds = parseIds(ids);
    const supabase = await createClient();

    const names: string[] = [];
    for (const part of chunk(tagIds)) {
      const { data, error } = await supabase.from("tags").select("name").in("id", part);
      if (error) throw new Error(error.message);
      names.push(...(data ?? []).map((t) => t.name));
    }

    for (const part of chunk(tagIds)) {
      const { error } = await supabase.from("tags").delete().in("id", part);
      if (error) throw new Error(error.message);
    }

    // Remove cada tag excluída dos contatos que a possuem.
    for (const name of names) {
      const { error } = await supabase.rpc("remove_contact_tag", { tag_name: name });
      if (error) throw new Error(error.message);
    }

    kickAutomationProcessor();
    revalidateTagSurfaces();
    return `${pluralize(names.length, "tag excluída", "tags excluídas")}. Removidas também dos contatos.`;
  });
}
