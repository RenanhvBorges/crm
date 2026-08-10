import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import { getLead, listFormLeads, listLeadForms, type MetaLead } from "./graph";
import {
  defaultMappings,
  normalizeLead,
  parseFieldMappings,
  type FormQuestion,
  type LeadAttribution,
} from "./field-mapping";

type Admin = SupabaseClient<Database>;
type Connection = Tables<"meta_connections">;
type LeadForm = Tables<"meta_lead_forms">;

// Tentativas por lead antes de parar de reprocessar sozinho (o botão
// "Reprocessar" na tela zera o contador).
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;
// Sobreposição na janela do polling: cobre lead criado entre a última consulta
// e a gravação de last_polled_at.
const POLL_OVERLAP_MS = 10 * 60_000;
// Intervalo mínimo entre consultas do mesmo formulário. O webhook é o caminho
// normal — o polling só existe como rede de segurança, então não vale gastar
// cota da Graph API a cada tick do cron.
const POLL_INTERVAL_MS = 15 * 60_000;
// A Meta retém leads por 90 dias — é o máximo que o backfill inicial alcança.
const BACKFILL_WINDOW_MS = 90 * 86_400_000;

export type LeadgenNotification = {
  leadgen_id: string;
  form_id: string;
  page_id?: string | null;
  created_time?: number | null;
};

export async function activeConnection(admin: Admin): Promise<Connection | null> {
  const { data } = await admin
    .from("meta_connections")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// Grava o aviso do webhook como lead pendente. O unique em leadgen_id absorve
// reentregas da Meta e a corrida com o polling de reconciliação.
export async function enqueueLeadgen(
  admin: Admin,
  notifications: LeadgenNotification[],
): Promise<number> {
  if (!notifications.length) return 0;

  const rows = notifications.map((n) => ({
    leadgen_id: n.leadgen_id,
    form_id: n.form_id,
    page_id: n.page_id ?? null,
    created_time: n.created_time ? new Date(n.created_time * 1000).toISOString() : null,
    raw: { webhook: n } as Json,
  }));

  const { data, error } = await admin
    .from("meta_leads")
    .upsert(rows, { onConflict: "leadgen_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export type ProcessSummary = { processed: number; failed: number; ignored: number };

// Consome a fila de leads: busca o lead na Graph API (quando ainda não veio
// junto), aplica o mapeamento, cria/atualiza o contato, coloca na lista de
// destino e emite o evento de automação.
export async function processPendingMetaLeads(admin: Admin = createAdminClient()): Promise<ProcessSummary> {
  const summary: ProcessSummary = { processed: 0, failed: 0, ignored: 0 };

  const connection = await activeConnection(admin);
  if (!connection) return summary;

  const { data: pending } = await admin
    .from("meta_leads")
    .select("*")
    .in("status", ["pending", "error"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(BATCH_SIZE);
  if (!pending?.length) return summary;

  let forms = await loadForms(admin, connection.id);
  // Formulário criado na Meta depois da última sincronização: recarrega o
  // catálogo uma vez antes de desistir do lead.
  if (pending.some((lead) => !forms.has(lead.form_id))) {
    await syncLeadForms(admin, connection);
    forms = await loadForms(admin, connection.id);
  }

  let touchedContacts = false;

  for (const lead of pending) {
    // Claim otimista: só um worker consegue levar attempts de N para N+1.
    const { data: claimed } = await admin
      .from("meta_leads")
      .update({ attempts: lead.attempts + 1 })
      .eq("id", lead.id)
      .lt("attempts", lead.attempts + 1)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const form = forms.get(lead.form_id);

    if (form && !form.is_enabled) {
      await admin
        .from("meta_leads")
        .update({
          status: "ignored",
          error_message: "Formulário desativado na integração.",
          processed_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      summary.ignored++;
      continue;
    }

    try {
      const contactId = await ingestLead(admin, connection, form ?? null, lead);
      await admin
        .from("meta_leads")
        .update({
          status: "processed",
          contact_id: contactId,
          error_message: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      summary.processed++;
      touchedContacts = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[meta-leads] falha ao processar o lead ${lead.leadgen_id}:`, message);
      await admin
        .from("meta_leads")
        .update({ status: "error", error_message: message })
        .eq("id", lead.id);
      summary.failed++;
    }
  }

  if (touchedContacts) kickAutomationProcessor();

  return summary;
}

async function loadForms(admin: Admin, connectionId: string): Promise<Map<string, LeadForm>> {
  const { data } = await admin.from("meta_lead_forms").select("*").eq("connection_id", connectionId);
  return new Map((data ?? []).map((f) => [f.form_id, f]));
}

type RawLeadPayload = { webhook?: LeadgenNotification; lead?: MetaLead };

async function ingestLead(
  admin: Admin,
  connection: Connection,
  form: LeadForm | null,
  row: Tables<"meta_leads">,
): Promise<string> {
  const raw = (row.raw ?? {}) as RawLeadPayload;
  // O polling já traz o lead completo; o webhook só manda o id.
  const lead = raw.lead ?? (await getLead(row.leadgen_id, connection.page_access_token));

  const questions = (form?.questions ?? []) as FormQuestion[];
  const mappings = form
    ? { ...defaultMappings(questions), ...parseFieldMappings(form.field_mappings) }
    : {};

  const attribution: LeadAttribution = {
    __campaign_name: lead.campaign_name,
    __adset_name: lead.adset_name,
    __ad_name: lead.ad_name,
    __form_name: form?.name,
    __platform: lead.platform,
  };

  const normalized = normalizeLead(lead.field_data ?? [], attribution, mappings);

  const listId = form?.target_list_id ?? connection.default_list_id;
  const tags = [...new Set([...connection.default_tags, ...(form?.tags ?? [])])];

  const contactId = await upsertContact(admin, normalized, tags);

  if (listId) {
    const { error } = await admin
      .from("contact_list_members")
      .upsert(
        { list_id: listId, contact_id: contactId },
        { onConflict: "list_id,contact_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(`Não foi possível adicionar à lista: ${error.message}`);
  }

  await admin.from("automation_events").insert({
    event_type: "meta.lead_received",
    contact_id: contactId,
    payload: {
      leadgen_id: lead.id,
      form_id: row.form_id,
      form_name: form?.name ?? null,
      campaign_id: lead.campaign_id ?? null,
      campaign_name: lead.campaign_name ?? null,
      ad_id: lead.ad_id ?? null,
      ad_name: lead.ad_name ?? null,
      platform: lead.platform ?? null,
      is_organic: lead.is_organic ?? null,
      list_id: listId,
    } as Json,
  });

  await admin
    .from("meta_leads")
    .update({
      raw: { ...raw, lead } as Json,
      created_time: row.created_time ?? lead.created_time ?? null,
      page_id: row.page_id ?? connection.page_id,
    })
    .eq("id", row.id);

  return contactId;
}

type Normalized = ReturnType<typeof normalizeLead>;

// Dedup: e-mail primeiro; sem e-mail no formulário, casa pelo telefone
// normalizado (função SQL find_contact_by_phone).
async function findExistingContact(admin: Admin, normalized: Normalized): Promise<string | null> {
  if (normalized.email) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .ilike("email", normalized.email)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  if (normalized.phone) {
    const { data } = await admin.rpc("find_contact_by_phone", { p_phone: normalized.phone });
    if (data) return data;
  }

  return null;
}

async function upsertContact(
  admin: Admin,
  normalized: Normalized,
  tags: string[],
): Promise<string> {
  // contacts.name é obrigatório: formulário só de telefone ainda precisa de um
  // rótulo legível na listagem.
  const name = normalized.name ?? normalized.email ?? normalized.phone ?? "Lead do Meta Ads";
  const existingId = await findExistingContact(admin, normalized);

  if (!existingId) {
    const { data, error } = await admin
      .from("contacts")
      .insert({
        name,
        email: normalized.email,
        phone: normalized.phone,
        company: normalized.company,
        tags,
        custom_fields: normalized.customFields as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Não foi possível criar o contato: ${error.message}`);
    return data.id;
  }

  const { data: existing, error: readError } = await admin
    .from("contacts")
    .select("id, name, email, phone, company, tags, custom_fields")
    .eq("id", existingId)
    .single();
  if (readError) throw new Error(`Não foi possível ler o contato: ${readError.message}`);

  // Campos fixos só preenchem o que está vazio — nome corrigido à mão no CRM
  // não é sobrescrito por uma nova submissão. Respostas do formulário
  // (custom_fields) e tags, sim: valem sempre as mais recentes.
  const { error } = await admin
    .from("contacts")
    .update({
      name: existing.name?.trim() ? existing.name : name,
      email: existing.email ?? normalized.email,
      phone: existing.phone ?? normalized.phone,
      company: existing.company ?? normalized.company,
      tags: [...new Set([...existing.tags, ...tags])],
      custom_fields: {
        ...((existing.custom_fields as Record<string, unknown> | null) ?? {}),
        ...normalized.customFields,
      } as Json,
    })
    .eq("id", existingId);
  if (error) throw new Error(`Não foi possível atualizar o contato: ${error.message}`);

  return existingId;
}

// Recarrega o catálogo de formulários da página, preservando a configuração
// local (lista de destino, tags, mapeamento) dos que já existiam.
export async function syncLeadForms(admin: Admin, connection: Connection): Promise<number> {
  const forms = await listLeadForms(connection.page_id, connection.page_access_token);
  if (!forms.length) return 0;

  const existing = await loadForms(admin, connection.id);

  // Todas as linhas precisam ter exatamente as mesmas chaves: o upsert em lote
  // do PostgREST recusa objetos com formatos diferentes.
  const rows = forms.map((form) => {
    const current = existing.get(form.id);
    const questions = (form.questions ?? []) as FormQuestion[];
    return {
      connection_id: connection.id,
      form_id: form.id,
      name: form.name,
      status: form.status ?? null,
      questions: questions as unknown as Json,
      // Formulário novo entra com o auto-mapeamento; o já configurado mantém o
      // que o usuário definiu.
      field_mappings: current
        ? (current.field_mappings as Json)
        : (defaultMappings(questions) as unknown as Json),
      is_enabled: current?.is_enabled ?? true,
      target_list_id: current?.target_list_id ?? null,
      tags: current?.tags ?? [],
      last_polled_at: current?.last_polled_at ?? null,
    };
  });

  const { error } = await admin
    .from("meta_lead_forms")
    .upsert(rows, { onConflict: "form_id" });
  if (error) throw new Error(`Não foi possível salvar os formulários: ${error.message}`);

  return rows.length;
}

export type PollSummary = { forms: number; found: number };

// Reconciliação: varre os formulários ativos atrás de leads que o webhook não
// entregou (queda, deploy, assinatura fora do ar). Também é o backfill: um
// formulário nunca consultado volta 90 dias.
export async function pollFormLeads(admin: Admin = createAdminClient()): Promise<PollSummary> {
  const summary: PollSummary = { forms: 0, found: 0 };

  const connection = await activeConnection(admin);
  if (!connection) return summary;

  const { data: forms } = await admin
    .from("meta_lead_forms")
    .select("*")
    .eq("connection_id", connection.id)
    .eq("is_enabled", true);
  if (!forms?.length) return summary;

  for (const form of forms) {
    const lastPolled = form.last_polled_at ? Date.parse(form.last_polled_at) : null;
    if (lastPolled !== null && Date.now() - lastPolled < POLL_INTERVAL_MS) continue;

    const since =
      lastPolled !== null ? lastPolled - POLL_OVERLAP_MS : Date.now() - BACKFILL_WINDOW_MS;

    try {
      const leads = await listFormLeads(
        form.form_id,
        connection.page_access_token,
        Math.floor(since / 1000),
      );
      summary.forms++;

      if (leads.length) {
        const rows = leads.map((lead) => ({
          leadgen_id: lead.id,
          form_id: form.form_id,
          page_id: connection.page_id,
          created_time: lead.created_time ?? null,
          raw: { lead } as Json,
        }));
        const { data, error } = await admin
          .from("meta_leads")
          .upsert(rows, { onConflict: "leadgen_id", ignoreDuplicates: true })
          .select("id");
        if (error) throw new Error(error.message);
        summary.found += data?.length ?? 0;
      }

      await admin
        .from("meta_lead_forms")
        .update({ last_polled_at: new Date().toISOString() })
        .eq("id", form.id);
    } catch (err) {
      // Um formulário arquivado ou sem permissão não pode travar os demais.
      console.error(`[meta-leads] falha ao consultar o formulário ${form.form_id}:`, err);
    }
  }

  await admin
    .from("meta_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return summary;
}
