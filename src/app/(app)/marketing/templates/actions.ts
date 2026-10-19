"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_EMAIL_DOCUMENT, emailDocumentSchema, type EmailDocument } from "@/lib/email-blocks";
import type { Json } from "@/lib/supabase/database.types";
import { chunk, parseIds, pluralize, runBulk, type BulkResult } from "@/lib/bulk";

export async function createTemplate(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!name) throw new Error("Informe um nome para o template.");

  const { data, error } = await supabase
    .from("email_templates")
    .insert({ name, subject, content: EMPTY_EMAIL_DOCUMENT as unknown as Json })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/marketing/templates");
  redirect(`/marketing/templates/${data.id}`);
}

export async function updateTemplateDetails(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!name) throw new Error("Informe um nome para o template.");

  const { error } = await supabase
    .from("email_templates")
    .update({ name, subject, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/marketing/templates/${id}`);
  revalidatePath("/marketing/templates");
}

export async function updateTemplateContent(id: string, document: EmailDocument) {
  const parsed = emailDocumentSchema.safeParse(document);
  if (!parsed.success) throw new Error("Conteúdo do template inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({
      content: parsed.data as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/marketing/templates/${id}`);
}

export async function duplicateTemplate(id: string) {
  const supabase = await createClient();
  const { data: original, error: fetchError } = await supabase
    .from("email_templates")
    .select("name, subject, content")
    .eq("id", id)
    .single();
  if (fetchError || !original) throw new Error(fetchError?.message ?? "Template não encontrado.");

  const { data, error } = await supabase
    .from("email_templates")
    .insert({ ...original, name: `${original.name} (cópia)` })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/marketing/templates");
  redirect(`/marketing/templates/${data.id}`);
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/marketing/templates");
  redirect("/marketing/templates");
}

export async function bulkDeleteTemplates(ids: string[]): Promise<BulkResult> {
  return runBulk(async () => {
    const templateIds = parseIds(ids);
    const supabase = await createClient();

    let deleted = 0;
    for (const part of chunk(templateIds)) {
      const { error, count } = await supabase
        .from("email_templates")
        .delete({ count: "exact" })
        .in("id", part);
      if (error) throw new Error(error.message);
      deleted += count ?? 0;
    }

    revalidatePath("/marketing/templates");
    return `${pluralize(deleted, "template excluído", "templates excluídos")}.`;
  });
}
