import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { deleteCampaign } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Falhou",
  canceled: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-bg-surface-2 text-fg-3",
  scheduled: "bg-oxford-blue-50 text-oxford-blue",
  sending: "bg-amber-50 text-amber-700",
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  canceled: "bg-bg-surface-2 text-fg-3",
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("id, name, subject, status, created_at")
    .eq("is_system", false)
    .order("created_at", { ascending: false });

  const { data: recipients } = await supabase
    .from("email_campaign_recipients")
    .select("campaign_id, status, opened_at, clicked_at");

  const statsByCampaign = new Map<string, { sent: number; opened: number; clicked: number }>();
  for (const r of recipients ?? []) {
    const cur = statsByCampaign.get(r.campaign_id) ?? { sent: 0, opened: 0, clicked: 0 };
    if (r.status !== "pending" && r.status !== "suppressed") cur.sent += 1;
    if (r.opened_at) cur.opened += 1;
    if (r.clicked_at) cur.clicked += 1;
    statsByCampaign.set(r.campaign_id, cur);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl">Campanhas</h1>
          <p className="text-sm text-fg-3">
            E-mails enviados manualmente para um contato ou lista.
          </p>
        </div>
        <Link
          href="/marketing/campaigns/new"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Nova campanha
        </Link>
      </div>

      <div className="rounded-lg border border-border-1 bg-oxford-white">
        {campaigns?.length ? (
          <ul className="divide-y divide-border-1">
            {campaigns.map((c) => {
              const stats = statsByCampaign.get(c.id) ?? { sent: 0, opened: 0, clicked: 0 };
              return (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Link
                      href={`/marketing/campaigns/${c.id}`}
                      className="text-sm font-medium text-fg-brand hover:underline"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-fg-3">{c.subject}</p>
                    {stats.sent > 0 ? (
                      <p className="mt-1 text-xs text-fg-muted">
                        {stats.sent} enviados · {stats.opened} aberturas · {stats.clicked} cliques
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[c.status] ?? ""}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <DeleteFieldButton
                      fieldId={c.id}
                      deleteAction={deleteCampaign}
                      confirmMessage="Excluir esta campanha?"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Nenhuma campanha criada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
