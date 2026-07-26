"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(label: string) {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createFieldDefinition(formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const fieldType = String(formData.get("field_type") ?? "text");
  const isRequired = formData.get("is_required") === "on";
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim() || null;

  const options =
    (fieldType === "select" || fieldType === "multiselect") && optionsRaw
      ? optionsRaw.split(",").map((opt) => ({ value: slugify(opt.trim()), label: opt.trim() }))
      : null;

  const { count } = await supabase
    .from("custom_field_definitions")
    .select("*", { count: "exact", head: true })
    .eq("entity", "contact");

  const { error } = await supabase.from("custom_field_definitions").insert({
    entity: "contact",
    key: slugify(label),
    label,
    field_type: fieldType,
    is_required: isRequired,
    options,
    group_id: groupId,
    sort_order: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe um campo com o nome "${label}".`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/contacts/fields");
}

export async function deleteFieldDefinition(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_field_definitions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/fields");
}

export async function createFieldGroup(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Informe um nome para o grupo.");
  }

  const { count } = await supabase
    .from("custom_field_groups")
    .select("*", { count: "exact", head: true })
    .eq("entity", "contact");

  const { error } = await supabase.from("custom_field_groups").insert({
    entity: "contact",
    name,
    sort_order: count ?? 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/fields");
}

export async function deleteFieldGroup(id: string) {
  const supabase = await createClient();
  // Campos do grupo ficam sem grupo (group_id -> null via FK on delete set null).
  const { error } = await supabase.from("custom_field_groups").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/fields");
}
