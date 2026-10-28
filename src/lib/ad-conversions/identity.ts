import { createHash } from "crypto";

// Normalização e hash dos dados do contato antes de enviar ao Google e à Meta.
// As duas plataformas pedem SHA-256 em hex sobre o valor normalizado, mas
// normalizam diferente (ex.: telefone com "+" no Google, só dígitos na Meta).

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Minúsculo e sem espaços. Para o Google, endereços gmail.com/googlemail.com
// também perdem os pontos antes do @ (guia de formatação de dados do Google).
export function normalizeEmail(
  raw: string | null | undefined,
  { stripGmailDots = false }: { stripGmailDots?: boolean } = {},
): string | null {
  const email = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (stripGmailDots && (domain === "gmail.com" || domain === "googlemail.com")) {
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return email;
}

// Telefone em dígitos com o código do país (E.164 sem o "+"). Sem "+", números
// com DDD e sem código do país (10 ou 11 dígitos) são tratados como do Brasil.
export function phoneDigits(raw: string | null | undefined): string | null {
  const international = (raw ?? "").trim().startsWith("+");
  let digits = (raw ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!international && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

// Primeiro e último nome, minúsculos e sem pontuação (formato da Meta).
export function splitName(raw: string | null | undefined): { first: string | null; last: string | null } {
  const parts = (raw ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  return { first: parts[0] ?? null, last: parts.length > 1 ? parts[parts.length - 1] : null };
}

// Identificadores de clique gravados pela LP em custom_fields.
export type ClickIds = {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  fbc: string | null;
  fbp: string | null;
};

export function clickIdsFrom(customFields: unknown, contactCreatedAt: string): ClickIds {
  const cf = (typeof customFields === "object" && customFields !== null ? customFields : {}) as Record<
    string,
    unknown
  >;
  const text = (key: string) => {
    const value = cf[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  // Sem o fbc (contatos anteriores à LP gravar o cookie), monta a partir do
  // fbclid, com o envio do formulário como momento do clique.
  let fbc = text("fbc");
  const fbclid = text("fbclid");
  if (!fbc && fbclid) {
    const clickedAt = Date.parse(text("lp_data_envio") ?? "") || Date.parse(contactCreatedAt) || Date.now();
    fbc = `fb.1.${clickedAt}.${fbclid}`;
  }
  return { gclid: text("gclid"), gbraid: text("gbraid"), wbraid: text("wbraid"), fbc, fbp: text("fbp") };
}
