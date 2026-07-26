import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DealKanbanBoard } from "@/components/deal-kanban-board";
import { DealQuickAddForm } from "@/components/deal-quick-add-form";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const { pipeline: pipelineParam } = await searchParams;
  const supabase = await createClient();

  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name, is_default")
    .order("sort_order");

  const activePipeline =
    pipelines?.find((p) => p.id === pipelineParam) ??
    pipelines?.find((p) => p.is_default) ??
    pipelines?.[0];

  if (!activePipeline) {
    return <p className="text-fg-muted">Nenhum funil configurado ainda.</p>;
  }

  const [{ data: stages }, { data: deals }, { data: contacts }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, color")
      .eq("pipeline_id", activePipeline.id)
      .order("sort_order"),
    supabase
      .from("deals")
      .select("id, title, value, stage_id, contact:contacts(id, name)")
      .eq("pipeline_id", activePipeline.id)
      .eq("status", "open"),
    supabase.from("contacts").select("id, name").order("name"),
  ]);

  const normalizedDeals = (deals ?? []).map((d) => ({
    ...d,
    contact: Array.isArray(d.contact) ? (d.contact[0] ?? null) : d.contact,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Negócios</h1>
          {pipelines && pipelines.length > 1 ? (
            <div className="mt-2 flex gap-2">
              {pipelines.map((p) => (
                <Link
                  key={p.id}
                  href={`/deals?pipeline=${p.id}`}
                  className={`rounded-full px-3 py-1 text-xs ${
                    p.id === activePipeline.id
                      ? "bg-oxford-blue text-white"
                      : "bg-bg-surface-2 text-fg-2"
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <DealQuickAddForm
          pipelineId={activePipeline.id}
          firstStageId={stages?.[0]?.id ?? ""}
          contacts={contacts ?? []}
        />
      </div>

      <DealKanbanBoard stages={stages ?? []} deals={normalizedDeals} />
    </div>
  );
}
