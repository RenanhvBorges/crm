import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { describeTrigger } from "@/lib/automations/triggers";
import { AutomationRowActions } from "./automation-row-actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-bg-surface-2 text-fg-3",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
};

export default async function AutomationsPage() {
  const supabase = await createClient();

  const [{ data: automations }, { data: enrollments }, { data: lists }, { data: stages }, { data: pipelines }, { data: campaigns }, { data: metaForms }] =
    await Promise.all([
      supabase
        .from("automations")
        .select("id, name, status, trigger_type, trigger_config, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("automation_enrollments").select("automation_id, status"),
      supabase.from("contact_lists").select("id, name"),
      supabase.from("pipeline_stages").select("id, name"),
      supabase.from("pipelines").select("id, name"),
      supabase.from("email_campaigns").select("id, name").eq("is_system", false),
      supabase.from("meta_lead_forms").select("form_id, name"),
    ]);

  const listName = new Map((lists ?? []).map((l) => [l.id, l.name]));
  const stageName = new Map((stages ?? []).map((s) => [s.id, s.name]));
  const pipelineName = new Map((pipelines ?? []).map((p) => [p.id, p.name]));
  const campaignName = new Map((campaigns ?? []).map((c) => [c.id, c.name]));
  const metaFormName = new Map((metaForms ?? []).map((f) => [f.form_id, f.name]));

  const counts = new Map<string, { active: number; completed: number }>();
  for (const e of enrollments ?? []) {
    const cur = counts.get(e.automation_id) ?? { active: 0, completed: 0 };
    if (e.status === "running" || e.status === "waiting") cur.active += 1;
    if (e.status === "completed") cur.completed += 1;
    counts.set(e.automation_id, cur);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl">Automações</h1>
          <p className="text-sm text-fg-3">
            Fluxos automáticos disparados por eventos do CRM, como no ActiveCampaign.
          </p>
        </div>
        <Link
          href="/automations/new"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Nova automação
        </Link>
      </div>

      <div className="rounded-lg border border-border-1 bg-oxford-white">
        {automations?.length ? (
          <ul className="divide-y divide-border-1">
            {automations.map((a) => {
              const stat = counts.get(a.id) ?? { active: 0, completed: 0 };
              return (
                <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/automations/${a.id}`}
                        className="truncate text-sm font-medium text-fg-brand hover:underline"
                      >
                        {a.name}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[a.status] ?? ""}`}
                      >
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                    <p className="text-xs text-fg-3">
                      {describeTrigger(a.trigger_type, a.trigger_config, {
                        list: (id) => listName.get(id),
                        stage: (id) => stageName.get(id),
                        pipeline: (id) => pipelineName.get(id),
                        campaign: (id) => campaignName.get(id),
                        metaForm: (id) => metaFormName.get(id),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">
                      {stat.active} em andamento · {stat.completed} concluídas
                    </p>
                  </div>
                  <AutomationRowActions id={a.id} status={a.status} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Nenhuma automação criada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
