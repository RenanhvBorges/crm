import { pollFormLeads, processPendingMetaLeads } from "@/lib/meta/ingest";

// Rede de segurança da integração de Lead Ads, agendada no pg_cron do Supabase
// (mesmo padrão do cron de automações e de campanhas, protegido por
// CRON_SECRET). Duas responsabilidades:
//   1. reprocessar leads que falharam ou que o webhook enfileirou sem concluir;
//   2. varrer os formulários atrás de leads que o webhook não entregou.
// O polling é limitado a 1x/15 min por formulário dentro de pollFormLeads, para
// não gastar cota da Graph API à toa.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const polled = await pollFormLeads();
    const processed = await processPendingMetaLeads();
    return Response.json({ ok: true, polled, processed });
  } catch (err) {
    console.error("[meta-leads-cron] falha no processamento:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha no processamento." },
      { status: 500 },
    );
  }
}
