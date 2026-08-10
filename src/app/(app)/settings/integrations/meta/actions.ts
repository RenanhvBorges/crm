"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateConnection, disconnectConnection } from "@/lib/meta/connect";
import { activeConnection, pollFormLeads, processPendingMetaLeads, syncLeadForms } from "@/lib/meta/ingest";
import { fieldMappingsSchema } from "@/lib/meta/field-mapping";
import type { Json } from "@/lib/supabase/database.types";

const PAGE_PATH = "/settings/integrations/meta";

// As tabelas da integração guardam o token da página, então toda action passa
// por aqui antes de usar o client de service role: sem sessão, sem operação.
async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre de novo.");
  return user;
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function activatePage(connectionId: string) {
  await requireSession();
  await activateConnection(createAdminClient(), connectionId);
  revalidatePath(PAGE_PATH);
}

export async function disconnectPage(connectionId: string) {
  await requireSession();
  await disconnectConnection(createAdminClient(), connectionId);
  revalidatePath(PAGE_PATH);
}

export async function saveDefaults(formData: FormData) {
  await requireSession();
  const admin = createAdminClient();

  const connection = await activeConnection(admin);
  if (!connection) throw new Error("Nenhuma página conectada.");

  const listId = String(formData.get("default_list_id") ?? "");
  const { error } = await admin
    .from("meta_connections")
    .update({
      default_list_id: listId || null,
      default_tags: parseTags(formData.get("default_tags")),
    })
    .eq("id", connection.id);
  if (error) throw new Error(error.message);

  revalidatePath(PAGE_PATH);
}

export async function saveFormConfig(formRowId: string, formData: FormData) {
  await requireSession();
  const admin = createAdminClient();

  const listId = String(formData.get("target_list_id") ?? "");

  // O mapeamento chega serializado do componente client; validar aqui evita
  // gravar jsonb fora do formato que o motor de ingestão espera.
  const rawMappings = String(formData.get("field_mappings") ?? "{}");
  let mappings: unknown;
  try {
    mappings = JSON.parse(rawMappings);
  } catch {
    throw new Error("Mapeamento de campos inválido.");
  }
  const parsed = fieldMappingsSchema.safeParse(mappings);
  if (!parsed.success) throw new Error("Mapeamento de campos inválido.");

  const { error } = await admin
    .from("meta_lead_forms")
    .update({
      is_enabled: formData.get("is_enabled") === "on",
      target_list_id: listId || null,
      tags: parseTags(formData.get("tags")),
      field_mappings: parsed.data as unknown as Json,
    })
    .eq("id", formRowId);
  if (error) throw new Error(error.message);

  revalidatePath(PAGE_PATH);
}

// Recarrega o catálogo de formulários da página (o usuário criou um formulário
// novo na Meta e quer configurá-lo sem esperar o próximo lead).
export async function refreshForms() {
  await requireSession();
  const admin = createAdminClient();

  const connection = await activeConnection(admin);
  if (!connection) throw new Error("Nenhuma página conectada.");

  await syncLeadForms(admin, connection);
  revalidatePath(PAGE_PATH);
}

// Sincroniza sob demanda: puxa o que o webhook não trouxe e processa a fila.
export async function syncNow() {
  await requireSession();
  const admin = createAdminClient();

  // Zera a janela do polling para que o "Sincronizar agora" não esbarre no
  // intervalo mínimo de 15 min entre consultas do mesmo formulário.
  const connection = await activeConnection(admin);
  if (!connection) throw new Error("Nenhuma página conectada.");
  await admin
    .from("meta_lead_forms")
    .update({ last_polled_at: new Date(Date.now() - 3_600_000).toISOString() })
    .eq("connection_id", connection.id)
    .not("last_polled_at", "is", null);

  await pollFormLeads(admin);
  await processPendingMetaLeads(admin);
  revalidatePath(PAGE_PATH);
}

export async function reprocessLead(leadId: string) {
  await requireSession();
  const admin = createAdminClient();

  const { error } = await admin
    .from("meta_leads")
    .update({ status: "pending", attempts: 0, error_message: null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  await processPendingMetaLeads(admin);
  revalidatePath(PAGE_PATH);
}
