import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRecipients, sendNextChunk } from "@/lib/email-send";

// Disparado a cada 5 min pelo Vercel Cron (ver vercel.json), protegido por
// CRON_SECRET. "Enviar agora" só marca scheduled_at = now() — este é o único
// caminho de código que efetivamente resolve destinatários e despacha e-mails,
// tanto para envio imediato quanto agendado.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("email_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  for (const campaign of due ?? []) {
    try {
      await supabase.from("email_campaigns").update({ status: "sending" }).eq("id", campaign.id);
      await resolveRecipients(campaign.id);
    } catch (err) {
      console.error(`[marketing-cron] falha ao resolver destinatários de ${campaign.id}:`, err);
    }
  }

  const { data: sending } = await supabase
    .from("email_campaigns")
    .select("id")
    .eq("status", "sending");

  const results: { campaignId: string; sent: number; remaining: number; error?: string }[] = [];
  for (const campaign of sending ?? []) {
    try {
      const result = await sendNextChunk(campaign.id);
      results.push({ campaignId: campaign.id, ...result });
      if (result.remaining === 0) {
        await supabase
          .from("email_campaigns")
          .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
          .eq("id", campaign.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[marketing-cron] falha ao enviar chunk de ${campaign.id}:`, err);
      // Não muda o status (deixa em "sending" para tentar de novo no próximo
      // tick) — só registra o erro pra ficar visível na UI, já que os logs
      // do runtime não são acessíveis fora da Vercel.
      await supabase
        .from("email_campaigns")
        .update({ error_message: message })
        .eq("id", campaign.id);
      results.push({ campaignId: campaign.id, sent: 0, remaining: -1, error: message });
    }
  }

  return Response.json({ processed: results });
}
