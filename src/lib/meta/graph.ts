import "server-only";
import { createHmac } from "crypto";

// Client da Graph API da Meta usado pela integração de Lead Ads. Só o que a
// integração precisa: OAuth da página, assinatura do webhook de leadgen,
// catálogo de formulários e leitura de leads.

const DEFAULT_VERSION = "v25.0";

export function graphVersion(): string {
  return process.env.META_GRAPH_VERSION ?? DEFAULT_VERSION;
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
  }
}

export type MetaConfig = { appId: string; appSecret: string };

export function metaConfig(): MetaConfig {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new MetaApiError("Configure META_APP_ID e META_APP_SECRET no ambiente.");
  }
  return { appId, appSecret };
}

// A Meta exige (ou recomenda, conforme a configuração do app) provar que a
// chamada partiu de quem tem o app secret, e não só do token vazado.
export function appsecretProof(accessToken: string): string {
  return createHmac("sha256", metaConfig().appSecret).update(accessToken).digest("hex");
}

// Assinatura do webhook: HMAC do corpo CRU com o app secret.
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", metaConfig().appSecret).update(rawBody).digest("hex");
  const received = header.slice("sha256=".length);
  // Comparação de tamanho fixo em hex; timingSafeEqual exigiria buffers do
  // mesmo tamanho e o header vem de fora, então checa o tamanho antes.
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return diff === 0;
}

const REQUEST_TIMEOUT_MS = 15_000;

type GraphParams = Record<string, string | number | undefined>;

async function graphRequest<T>(
  path: string,
  { method = "GET", accessToken, params = {} }: {
    method?: "GET" | "POST" | "DELETE";
    accessToken?: string;
    params?: GraphParams;
  } = {},
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  if (accessToken) {
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("appsecret_proof", appsecretProof(accessToken));
  }

  let response: Response;
  try {
    response = await fetch(url, { method, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new MetaApiError(
      `Falha de rede ao chamar a Graph API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: number; error_subcode?: number } })
    | null;

  if (!response.ok || body?.error) {
    const error = body?.error;
    throw new MetaApiError(
      error?.message ?? `A Graph API respondeu ${response.status}.`,
      error?.code,
      error?.error_subcode,
    );
  }
  if (!body) throw new MetaApiError("Resposta vazia da Graph API.");
  return body;
}

// --- OAuth -----------------------------------------------------------------

export function oauthDialogUrl(redirectUri: string, state: string, scopes: string[]): string {
  const url = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", metaConfig().appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

type TokenResponse = { access_token: string; token_type?: string; expires_in?: number };

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const { appId, appSecret } = metaConfig();
  const data = await graphRequest<TokenResponse>("oauth/access_token", {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    },
  });
  return data.access_token;
}

// Token de usuário de curta duração (~1h) vira um de ~60 dias. Os tokens de
// página derivados de um token longo não expiram, que é o que a integração
// precisa para rodar sozinha.
export async function exchangeForLongLivedToken(userToken: string): Promise<string> {
  const { appId, appSecret } = metaConfig();
  const data = await graphRequest<TokenResponse>("oauth/access_token", {
    params: {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: userToken,
    },
  });
  return data.access_token;
}

export type MetaPage = { id: string; name: string; access_token: string; tasks?: string[] };

export async function listPages(userToken: string): Promise<MetaPage[]> {
  const data = await graphRequest<{ data: MetaPage[] }>("me/accounts", {
    accessToken: userToken,
    params: { fields: "id,name,access_token,tasks", limit: 100 },
  });
  return data.data ?? [];
}

export async function listGrantedScopes(userToken: string): Promise<string[]> {
  const data = await graphRequest<{ data: { permission: string; status: string }[] }>(
    "me/permissions",
    { accessToken: userToken },
  );
  return (data.data ?? []).filter((p) => p.status === "granted").map((p) => p.permission);
}

// --- Assinatura de leadgen na página ---------------------------------------

export async function subscribePageToLeadgen(pageId: string, pageToken: string): Promise<void> {
  await graphRequest(`${pageId}/subscribed_apps`, {
    method: "POST",
    accessToken: pageToken,
    params: { subscribed_fields: "leadgen" },
  });
}

export async function unsubscribePage(pageId: string, pageToken: string): Promise<void> {
  await graphRequest(`${pageId}/subscribed_apps`, {
    method: "DELETE",
    accessToken: pageToken,
  });
}

// --- Formulários e leads ---------------------------------------------------

export type MetaFormQuestion = { key: string; label?: string; type?: string };

export type MetaLeadForm = {
  id: string;
  name: string;
  status?: string;
  questions?: MetaFormQuestion[];
};

export async function listLeadForms(pageId: string, pageToken: string): Promise<MetaLeadForm[]> {
  const forms: MetaLeadForm[] = [];
  let after: string | undefined;

  // Páginas com muitos formulários: até 5 páginas de 100 é folgado o bastante.
  for (let page = 0; page < 5; page++) {
    const data = await graphRequest<{
      data: MetaLeadForm[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`${pageId}/leadgen_forms`, {
      accessToken: pageToken,
      params: { fields: "id,name,status,questions", limit: 100, after },
    });
    forms.push(...(data.data ?? []));
    after = data.paging?.next ? data.paging.cursors?.after : undefined;
    if (!after) break;
  }

  return forms;
}

export type MetaLeadFieldData = { name: string; values: string[] };

export type MetaLead = {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  platform?: string;
  is_organic?: boolean;
  field_data: MetaLeadFieldData[];
};

const LEAD_FIELDS =
  "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform,is_organic,field_data";

export async function getLead(leadgenId: string, pageToken: string): Promise<MetaLead> {
  return graphRequest<MetaLead>(leadgenId, {
    accessToken: pageToken,
    params: { fields: LEAD_FIELDS },
  });
}

// Leads de um formulário criados depois de `since` (epoch em segundos). É o
// caminho da reconciliação: pega o que o webhook não entregou e faz o backfill
// inicial (a Meta guarda leads por 90 dias).
export async function listFormLeads(
  formId: string,
  pageToken: string,
  since: number,
): Promise<MetaLead[]> {
  const leads: MetaLead[] = [];
  let after: string | undefined;

  for (let page = 0; page < 10; page++) {
    const data = await graphRequest<{
      data: MetaLead[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`${formId}/leads`, {
      accessToken: pageToken,
      params: {
        fields: LEAD_FIELDS,
        limit: 100,
        after,
        filtering: JSON.stringify([
          { field: "time_created", operator: "GREATER_THAN", value: since },
        ]),
      },
    });
    leads.push(...(data.data ?? []));
    after = data.paging?.next ? data.paging.cursors?.after : undefined;
    if (!after) break;
  }

  return leads;
}
