import "server-only";
import { normalizeEmail, phoneDigits, sha256, splitName, type ClickIds } from "./identity";
import type { SendResult } from "./google";

// Conversões offline da Meta pela Conversions API, no formato de eventos de CRM
// (action_source "system_generated" + custom_data.event_source "crm"). A antiga
// Offline Conversions API foi desligada em 2025.

export const META_GRAPH_VERSION = "v26.0";
const GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const REQUEST_TIMEOUT_MS = 15_000;

// A Meta recusa eventos com event_time de mais de 7 dias (e o lote inteiro
// junto), então a fila descarta antes de enviar.
export const META_MAX_EVENT_AGE_MS = 7 * 86_400_000;

export type MetaEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "system_generated";
  user_data: Record<string, string | string[]>;
  custom_data: Record<string, string | number>;
};

// Monta o evento já com hash. external_id (id do contato) sozinho não casa com
// ninguém, então sem e-mail, telefone, fbc ou fbp não há o que enviar.
export function buildMetaEvent(input: {
  eventName: string;
  eventId: string;
  eventTime: Date;
  value: number | null;
  currency: string;
  contactId: string;
  name: string;
  email: string | null;
  phone: string | null;
  clickIds: ClickIds;
}): MetaEvent | null {
  const userData: Record<string, string | string[]> = {};
  const email = normalizeEmail(input.email);
  if (email) userData.em = [sha256(email)];
  const phone = phoneDigits(input.phone);
  if (phone) userData.ph = [sha256(phone)];
  if (input.clickIds.fbc) userData.fbc = input.clickIds.fbc;
  if (input.clickIds.fbp) userData.fbp = input.clickIds.fbp;
  if (!Object.keys(userData).length) return null;

  const { first, last } = splitName(input.name);
  if (first) userData.fn = [sha256(first)];
  if (last) userData.ln = [sha256(last)];
  userData.external_id = [sha256(input.contactId)];
  if (phone?.startsWith("55")) userData.country = [sha256("br")];

  return {
    event_name: input.eventName,
    event_time: Math.floor(input.eventTime.getTime() / 1000),
    event_id: input.eventId,
    action_source: "system_generated",
    user_data: userData,
    custom_data: {
      event_source: "crm",
      lead_event_source: "Oxford CRM",
      ...(input.value !== null ? { value: input.value, currency: input.currency } : {}),
    },
  };
}

function metaError(status: number, json: Record<string, unknown>): string {
  const error = (json.error ?? {}) as { message?: string; error_user_msg?: string };
  return `Meta respondeu ${status}: ${error.error_user_msg ?? error.message ?? "sem detalhes"}`;
}

export async function sendMetaEvents(options: {
  datasetId: string;
  accessToken: string;
  testEventCode?: string;
  events: MetaEvent[];
}): Promise<SendResult> {
  try {
    const response = await fetch(`${GRAPH_URL}/${options.datasetId}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: options.events,
        ...(options.testEventCode ? { test_event_code: options.testEventCode } : {}),
        access_token: options.accessToken,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) return { ok: false, error: metaError(response.status, json), response: json };
    return { ok: true, response: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao chamar a Meta." };
  }
}

// Teste sem efeito colateral: lê o dataset com o token (não envia evento).
export async function fetchMetaDataset(datasetId: string, accessToken: string): Promise<SendResult> {
  try {
    const url = `${GRAPH_URL}/${datasetId}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) return { ok: false, error: metaError(response.status, json), response: json };
    return { ok: true, response: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao chamar a Meta." };
  }
}
