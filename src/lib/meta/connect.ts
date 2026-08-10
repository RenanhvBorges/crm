import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { subscribePageToLeadgen, unsubscribePage } from "./graph";
import { syncLeadForms } from "./ingest";

type Admin = SupabaseClient<Database>;

// Nomes criados na primeira conexão. A lista é o destino padrão pedido no
// escopo ("os leads têm que cair na lista de leads do formulário"); o usuário
// pode trocar depois na tela da integração.
export const DEFAULT_LIST_NAME = "Leads - Formulário (Meta Ads)";
export const DEFAULT_TAG = "Meta Ads";

export const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
  "ads_management",
];

export const OAUTH_STATE_COOKIE = "meta_oauth_state";

// A URI precisa bater caractere a caractere com a cadastrada em
// "Facebook Login → URIs de redirecionamento válidas", tanto no dialog quanto
// na troca do code — por isso vive num lugar só.
export function oauthRedirectUri(): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/meta/oauth/callback`;
}

// Encontra (ou cria) a lista padrão dos leads e garante a tag no catálogo,
// para ela já aparecer com cor em vez de texto solto.
export async function ensureDefaultList(admin: Admin): Promise<string | null> {
  const { data: existing } = await admin
    .from("contact_lists")
    .select("id")
    .eq("name", DEFAULT_LIST_NAME)
    .maybeSingle();

  await admin
    .from("tags")
    .upsert({ name: DEFAULT_TAG, color: "#1877F2" }, { onConflict: "name", ignoreDuplicates: true });

  if (existing) return existing.id;

  const { count } = await admin.from("contact_lists").select("*", { count: "exact", head: true });
  const { data, error } = await admin
    .from("contact_lists")
    .insert({
      name: DEFAULT_LIST_NAME,
      description: "Leads dos formulários instantâneos da Meta Ads, criados automaticamente.",
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[meta-leads] falha ao criar a lista padrão:", error.message);
    return null;
  }
  return data.id;
}

// Ativa uma página: só uma conexão fica ativa por vez, assina o campo leadgen
// no app e carrega o catálogo de formulários.
export async function activateConnection(admin: Admin, connectionId: string): Promise<void> {
  const { data: connection, error } = await admin
    .from("meta_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (error || !connection) throw new Error("Conexão não encontrada.");

  await subscribePageToLeadgen(connection.page_id, connection.page_access_token);

  const listId = connection.default_list_id ?? (await ensureDefaultList(admin));

  await admin.from("meta_connections").update({ is_active: false }).neq("id", connectionId);

  const { error: updateError } = await admin
    .from("meta_connections")
    .update({
      is_active: true,
      webhook_subscribed_at: new Date().toISOString(),
      default_list_id: listId,
      default_tags: connection.default_tags.length ? connection.default_tags : [DEFAULT_TAG],
    })
    .eq("id", connectionId);
  if (updateError) throw new Error(updateError.message);

  await syncLeadForms(admin, { ...connection, default_list_id: listId, is_active: true });
}

// Desconecta a página: cancela a assinatura na Meta (best effort — token
// revogado do outro lado não pode travar a limpeza local) e apaga a conexão,
// levando junto os formulários por cascade. O histórico em meta_leads fica.
export async function disconnectConnection(admin: Admin, connectionId: string): Promise<void> {
  const { data: connection } = await admin
    .from("meta_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) return;

  try {
    await unsubscribePage(connection.page_id, connection.page_access_token);
  } catch (err) {
    console.error("[meta-leads] falha ao cancelar a assinatura na Meta:", err);
  }

  const { error } = await admin.from("meta_connections").delete().eq("id", connectionId);
  if (error) throw new Error(error.message);
}
