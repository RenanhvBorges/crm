"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { CustomFieldValues } from "@/lib/custom-fields";
import { chunk, parseIds, pluralize, runBulk, type BulkResult } from "@/lib/bulk";

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

// ---------------------------------------------------------------------------
// Ações em massa
// ---------------------------------------------------------------------------

const MAX_BULK_TAGS = 50;

function parseTagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) throw new Error("Escolha ao menos uma tag.");
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of tags) {
    const name = String(raw).trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  if (!names.length) throw new Error("Escolha ao menos uma tag.");
  if (names.length > MAX_BULK_TAGS) {
    throw new Error(`Escolha no máximo ${MAX_BULK_TAGS} tags por vez.`);
  }
  return names;
}

// contacts.tags é sobrescrito por inteiro (não há operação atômica de
// "adicionar elemento"), então lemos as tags atuais, calculamos o novo array por
// contato e gravamos. Contatos que terminam com o mesmo array são gravados
// juntos, em lote. `transform` devolve null quando o contato não muda.
async function rewriteContactTags(
  contactIds: string[],
  transform: (current: string[]) => string[] | null,
): Promise<number> {
  const supabase = await createClient();
  const groups = new Map<string, { tags: string[]; ids: string[] }>();

  for (const part of chunk(contactIds)) {
    const { data, error } = await supabase.from("contacts").select("id, tags").in("id", part);
    if (error) throw new Error(error.message);

    for (const contact of data ?? []) {
      const next = transform(contact.tags ?? []);
      if (!next) continue;
      const key = JSON.stringify(next);
      const group = groups.get(key) ?? { tags: next, ids: [] };
      group.ids.push(contact.id);
      groups.set(key, group);
    }
  }

  let changed = 0;
  for (const group of groups.values()) {
    for (const part of chunk(group.ids)) {
      const { error } = await supabase.from("contacts").update({ tags: group.tags }).in("id", part);
      if (error) throw new Error(error.message);
      changed += part.length;
    }
  }

  if (changed) {
    kickAutomationProcessor();
    revalidatePath("/contacts");
    revalidatePath("/contacts/tags");
  }
  return changed;
}

export async function bulkAddTags(ids: string[], tags: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const contactIds = parseIds(ids);
    const toAdd = parseTagNames(tags);

    const changed = await rewriteContactTags(contactIds, (current) => {
      const have = new Set(current.map((t) => t.toLowerCase()));
      const missing = toAdd.filter((t) => !have.has(t.toLowerCase()));
      return missing.length ? [...current, ...missing] : null;
    });

    return changed
      ? `${pluralize(toAdd.length, "tag adicionada", "tags adicionadas")} em ${pluralize(changed, "contato", "contatos")}.`
      : "Os contatos selecionados já tinham essas tags.";
  });
}

export async function bulkRemoveTags(ids: string[], tags: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const contactIds = parseIds(ids);
    const toRemove = new Set(parseTagNames(tags).map((t) => t.toLowerCase()));

    const changed = await rewriteContactTags(contactIds, (current) => {
      const next = current.filter((t) => !toRemove.has(t.toLowerCase()));
      return next.length === current.length ? null : next;
    });

    return changed
      ? `Tags removidas de ${pluralize(changed, "contato", "contatos")}.`
      : "Nenhum dos contatos selecionados tinha essas tags.";
  });
}

export async function bulkDeleteContacts(ids: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const contactIds = parseIds(ids);
    const supabase = await createClient();

    let deleted = 0;
    for (const part of chunk(contactIds)) {
      const { error, count } = await supabase
        .from("contacts")
        .delete({ count: "exact" })
        .in("id", part);
      if (error) throw new Error(error.message);
      deleted += count ?? 0;
    }

    revalidatePath("/contacts");
    revalidatePath("/contacts/lists");
    revalidatePath("/deals");
    return `${pluralize(deleted, "contato excluído", "contatos excluídos")}.`;
  });
}
