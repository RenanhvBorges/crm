"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createList(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    throw new Error("Informe um nome para a lista.");
  }

  const { count } = await supabase
    .from("contact_lists")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("contact_lists").insert({
    name,
    description,
    sort_order: count ?? 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/lists");
}

export async function renameList(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    throw new Error("Informe um nome para a lista.");
  }

  const { error } = await supabase
    .from("contact_lists")
    .update({ name, description })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/lists");
  revalidatePath(`/contacts/lists/${id}`);
}

export async function deleteList(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_lists").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contacts/lists");
  redirect("/contacts/lists");
}

export async function addContactsToList(listId: string, contactIds: string[]) {
  const supabase = await createClient();

  if (!contactIds.length) return;

  const rows = contactIds.map((contactId) => ({
    list_id: listId,
    contact_id: contactId,
  }));

  // Ignora contatos já presentes na lista (PK composta).
  const { error } = await supabase
    .from("contact_list_members")
    .upsert(rows, { onConflict: "list_id,contact_id", ignoreDuplicates: true });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/contacts/lists/${listId}`);
  revalidatePath("/contacts/lists");
}

export async function removeContactFromList(listId: string, contactId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contact_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("contact_id", contactId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/contacts/lists/${listId}`);
  revalidatePath("/contacts/lists");
}
