import { processAutomations } from "@/lib/automations/engine";

// Disparado a cada 1 min pelo pg_cron do Supabase (job "process-automations")
// e pelo kick pós-mutação (src/lib/automations/kick.ts). Protegido por
// CRON_SECRET, mesmo padrão do cron de campanhas.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const summary = await processAutomations();
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[automations-cron] falha no processamento:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha no processamento." },
      { status: 500 },
    );
  }
}
