"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import { chunk, parseIds, pluralize, runBulk, type BulkResult } from "@/lib/bulk";

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

  kickAutomationProcessor();
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

  kickAutomationProcessor();
  revalidatePath(`/contacts/lists/${listId}`);
  revalidatePath("/contacts/lists");
}

// ---------------------------------------------------------------------------
// Ações em massa
// ---------------------------------------------------------------------------

export async function bulkAddContactsToList(
  listId: string,
  contactIds: string[],
): Promise<BulkResult> {
  return runBulk(async () => {
    const [validListId] = parseIds([listId]);
    const ids = parseIds(contactIds);
    const supabase = await createClient();

    // Ignora contatos já presentes na lista (PK composta).
    for (const part of chunk(ids, 500)) {
      const { error } = await supabase.from("contact_list_members").upsert(
        part.map((contactId) => ({ list_id: validListId, contact_id: contactId })),
        { onConflict: "list_id,contact_id", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    }

    kickAutomationProcessor();
    revalidatePath(`/contacts/lists/${validListId}`);
    revalidatePath("/contacts/lists");
    return `${pluralize(ids.length, "contato adicionado", "contatos adicionados")} à lista.`;
  });
}

export async function bulkRemoveContactsFromList(
  listId: string,
  contactIds: string[],
): Promise<BulkResult> {
  return runBulk(async () => {
    const [validListId] = parseIds([listId]);
    const ids = parseIds(contactIds);
    const supabase = await createClient();

    let removed = 0;
    for (const part of chunk(ids)) {
      const { error, count } = await supabase
        .from("contact_list_members")
        .delete({ count: "exact" })
        .eq("list_id", validListId)
        .in("contact_id", part);
      if (error) throw new Error(error.message);
      removed += count ?? 0;
    }

    kickAutomationProcessor();
    revalidatePath(`/contacts/lists/${validListId}`);
    revalidatePath("/contacts/lists");
    return `${pluralize(removed, "contato removido", "contatos removidos")} da lista.`;
  });
}

export async function bulkDeleteLists(ids: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const listIds = parseIds(ids);
    const supabase = await createClient();

    let deleted = 0;
    for (const part of chunk(listIds)) {
      const { error, count } = await supabase
        .from("contact_lists")
        .delete({ count: "exact" })
        .in("id", part);
      if (error) throw new Error(error.message);
      deleted += count ?? 0;
    }

    revalidatePath("/contacts/lists");
    return `${pluralize(deleted, "lista excluída", "listas excluídas")}. Os contatos não foram apagados.`;
  });
}
