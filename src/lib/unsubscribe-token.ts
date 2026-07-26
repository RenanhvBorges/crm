import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET não configurada.");
  return s;
}

function sign(recipientId: string): string {
  return createHmac("sha256", secret()).update(recipientId).digest("hex");
}

// Defesa em profundidade: o UUID do destinatário já não é adivinhável, mas o
// token HMAC evita que alguém troque o `rid` na URL para descadastrar outra
// pessoa.
export function verifyUnsubscribeToken(recipientId: string, token: string): boolean {
  const expected = Buffer.from(sign(recipientId));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function unsubscribeUrl(recipientId: string): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const token = sign(recipientId);
  return `${base}/unsubscribe?rid=${encodeURIComponent(recipientId)}&t=${token}`;
}
