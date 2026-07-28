import "server-only";
import { after } from "next/server";

// Dispara o processador de automações logo após a resposta da mutação, sem
// bloqueá-la (after roda pós-resposta). O cron de 1 min cobre o que escapar
// daqui (mutações via SQL direto, RPCs em massa, falha do fetch).
export function kickAutomationProcessor(): void {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  after(async () => {
    try {
      await fetch(`${baseUrl}/api/automations/cron/process`, {
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(55_000),
      });
    } catch {
      // Melhor esforço: o cron pega no próximo tick.
    }
  });
}
