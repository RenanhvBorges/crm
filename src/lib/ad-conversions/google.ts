import "server-only";
import { createSign } from "crypto";
import { normalizeEmail, phoneDigits, sha256, type ClickIds } from "./identity";

// Conversões offline do Google Ads pela Data Manager API (events:ingest). Desde
// 15/06/2026 o Google não aceita integrações novas de importação offline pela
// Google Ads API; a Data Manager API não usa developer token e autentica com
// uma conta de serviço (o e-mail dela precisa ter acesso à conta do Google Ads).

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/datamanager";
const INGEST_URL = "https://datamanager.googleapis.com/v1/events:ingest";
const REQUEST_TIMEOUT_MS = 15_000;

export type ServiceAccount = {
  client_email: string;
  private_key: string;
  private_key_id?: string;
};

// Valida o JSON colado na tela de Configurações; a mensagem vai para o usuário.
export function parseServiceAccount(json: string): ServiceAccount {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("O arquivo da conta de serviço não é um JSON válido.");
  }
  if (parsed.type !== "service_account") {
    throw new Error('O JSON precisa ser de uma conta de serviço ("type": "service_account").');
  }
  if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") {
    throw new Error("O JSON da conta de serviço está sem client_email ou private_key.");
  }
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    private_key_id: typeof parsed.private_key_id === "string" ? parsed.private_key_id : undefined,
  };
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

// JWT assinado com a chave da conta de serviço, trocado por um access token
// (fluxo jwt-bearer do OAuth do Google). O token vale 1 h e fica em cache.
export function signServiceAccountJwt(sa: ServiceAccount, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key);
  return `${header}.${claims}.${base64url(signature)}`;
}

export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const cacheKey = `${sa.client_email}:${sa.private_key_id ?? ""}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  let assertion: string;
  try {
    assertion = signServiceAccountJwt(sa, Math.floor(Date.now() / 1000));
  } catch {
    throw new Error("Não foi possível assinar com a chave da conta de serviço (private_key inválida).");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(
      `Google recusou a conta de serviço: ${json.error_description ?? json.error ?? response.status}`,
    );
  }
  tokenCache.set(cacheKey, {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  });
  return json.access_token;
}

export type GoogleEvent = {
  transactionId: string;
  eventTimestamp: string;
  eventSource: "WEB";
  adIdentifiers?: { gclid?: string; gbraid?: string; wbraid?: string };
  userData?: { userIdentifiers: ({ emailAddress: string } | { phoneNumber: string })[] };
  conversionValue?: number;
  currency?: string;
};

// Monta o evento já com hash (encoding HEX). O Google aceita um único ID de
// clique por conversão; sem nenhum, a atribuição fica com e-mail e telefone
// (conversões otimizadas para leads). null = nada para atribuir.
export function buildGoogleEvent(input: {
  transactionId: string;
  eventTime: Date;
  value: number | null;
  currency: string;
  email: string | null;
  phone: string | null;
  clickIds: ClickIds;
}): GoogleEvent | null {
  const { gclid, gbraid, wbraid } = input.clickIds;
  const adIdentifiers = gclid ? { gclid } : gbraid ? { gbraid } : wbraid ? { wbraid } : undefined;

  const userIdentifiers: ({ emailAddress: string } | { phoneNumber: string })[] = [];
  const email = normalizeEmail(input.email, { stripGmailDots: true });
  if (email) userIdentifiers.push({ emailAddress: sha256(email) });
  const phone = phoneDigits(input.phone);
  if (phone) userIdentifiers.push({ phoneNumber: sha256(`+${phone}`) });

  if (!adIdentifiers && !userIdentifiers.length) return null;

  return {
    transactionId: input.transactionId,
    eventTimestamp: input.eventTime.toISOString(),
    eventSource: "WEB",
    ...(adIdentifiers ? { adIdentifiers } : {}),
    ...(userIdentifiers.length ? { userData: { userIdentifiers } } : {}),
    ...(input.value !== null ? { conversionValue: input.value, currency: input.currency } : {}),
  };
}

export type SendResult =
  | { ok: true; response: Record<string, unknown> }
  | { ok: false; error: string; response?: Record<string, unknown> };

export async function ingestGoogleEvents(options: {
  serviceAccount: ServiceAccount;
  customerId: string;
  conversionActionId: string;
  events: GoogleEvent[];
  validateOnly?: boolean;
}): Promise<SendResult> {
  try {
    const token = await getAccessToken(options.serviceAccount);
    const response = await fetch(INGEST_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        destinations: [
          {
            operatingAccount: { accountType: "GOOGLE_ADS", accountId: options.customerId },
            productDestinationId: options.conversionActionId,
          },
        ],
        encoding: "HEX",
        events: options.events,
        validateOnly: options.validateOnly ?? false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error = (json.error ?? {}) as { message?: string; status?: string };
      return {
        ok: false,
        error: `Google respondeu ${response.status}${error.status ? ` ${error.status}` : ""}: ${error.message ?? "sem detalhes"}`,
        response: json,
      };
    }
    return { ok: true, response: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao chamar o Google." };
  }
}
