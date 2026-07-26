import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada.");
    client = new Resend(apiKey);
  }
  return client;
}

// "Nome <email@dominio>" — configurado uma vez via env, verificado manualmente
// no painel da Resend (configuração de domínio de envio self-service fica fora
// desta fase, ver placeholder "Domínios de e-mail" em Configurações).
export function getSenderAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL não configurada.");
  return from;
}

// Limite do plano gratuito da Resend — usado como guarda antes de despachar
// mais e-mails no mesmo dia.
export const RESEND_FREE_DAILY_LIMIT = 100;
export const RESEND_BATCH_MAX = 100;
