"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { CustomFieldValues } from "@/lib/custom-fields";

function parseContactFormData(formData: FormData) {
  const tagsRaw = String(formData.get("tags") ?? "");
  const customFieldsRaw = String(formData.get("custom_fields") ?? "{}");

  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    company: String(formData.get("company") ?? "").trim() || null,
    tags: tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    custom_fields: JSON.parse(customFieldsRaw) as CustomFieldValues,
  };
}

export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const values = parseContactFormData(formData);

  const { data, error } = await supabase
    .from("contacts")
    .insert(values)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  kickAutomationProcessor();
  revalidatePath("/contacts");
  redirect(`/contacts/${data.id}`);
}

export async function updateContact(contactId: string, formData: FormData) {
  const supabase = await createClient();
  const values = parseContactFormData(formData);

  const { error } = await supabase
    .from("contacts")
    .update(values)
    .eq("id", contactId);

  if (error) {
    throw new Error(error.message);
  }

  kickAutomationProcessor();
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts");
  redirect("/contacts");
}
