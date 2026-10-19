import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClosedDealsTable, type ClosedDealRow } from "@/components/closed-deals-table";
import { DealsViewTabs, type DealsView } from "@/components/deals-view-tabs";
import type { BulkStageOption } from "@/components/bulk/deals-bulk-bar";
import { isDealStatus, type DealStatus } from "@/lib/deals";

// Teto de linhas carregadas (o PostgREST também limita respostas a ~1000 linhas).
const MAX_ROWS = 1000;

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClosedDealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pipeline?: string; q?: string }>;
}) {
  const { status: statusParam, pipeline: pipelineParam, q } = await searchParams;
  const statusFilter: DealStatus | "all" =
    statusParam && isDealStatus(statusParam) && statusParam !== "open" ? statusParam : "all";
  const term = q?.trim() ?? "";

  const supabase = await createClient();

  let dealsQuery = supabase
    .from("deals")
    .select(
      "id, title, value, status, closed_at, pipeline:pipelines(id, name), stage:pipeline_stages(id, name), contact:contacts(id, name)",
      { count: "exact" },
    )
    .in("status", ["won", "lost"])
    .order("closed_at", { ascending: false, nullsFirst: false })
    .range(0, MAX_ROWS - 1);
  if (pipelineParam) dealsQuery = dealsQuery.eq("pipeline_id", pipelineParam);
  if (term) dealsQuery = dealsQuery.ilike("title", `%${term}%`);

  const [{ data: deals, count }, { data: pipelines }] = await Promise.all([
    dealsQuery,
    supabase
      .from("pipelines")
      .select("id, name, pipeline_stages(id, name, sort_order)")
      .order("sort_order"),
  ]);

  // Carrega ganhos e perdidos juntos para que contadores e totais não dependam
  // da aba escolhida; a aba só filtra o que a tabela exibe.
  const rows: ClosedDealRow[] = (deals ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    value: Number(d.value) || 0,
    status: d.status as DealStatus,
    closed_at: d.closed_at,
    pipeline_name: one(d.pipeline)?.name ?? null,
    stage_name: one(d.stage)?.name ?? null,
    contact: one(d.contact),
  }));

  const won = rows.filter((r) => r.status === "won");
  const lost = rows.filter((r) => r.status === "lost");
  const sum = (list: ClosedDealRow[]) => list.reduce((acc, r) => acc + r.value, 0);
  const winRate = rows.length ? Math.round((won.length / rows.length) * 100) : null;

  const visible = statusFilter === "won" ? won : statusFilter === "lost" ? lost : rows;
  const activeView: DealsView = statusFilter === "all" ? "closed" : statusFilter;

  const stageOptions: BulkStageOption[] = (pipelines ?? []).flatMap((p) =>
    [...p.pipeline_stages]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ id: s.id, name: s.name, pipelineName: p.name })),
  );

  const hrefWith = (overrides: { pipeline?: string | null }) => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const pipeline = "pipeline" in overrides ? overrides.pipeline : pipelineParam;
    if (pipeline) params.set("pipeline", pipeline);
    if (term) params.set("q", term);
    const qs = params.toString();
    return qs ? `/deals/closed?${qs}` : "/deals/closed";
  };

  const truncated = (count ?? rows.length) > rows.length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl">Negócios</h1>
        <DealsViewTabs
          active={activeView}
          counts={{ closed: rows.length, won: won.length, lost: lost.length }}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Ganhos" value={String(won.length)} hint={currency.format(sum(won))} />
        <Stat label="Perdidos" value={String(lost.length)} hint={currency.format(sum(lost))} />
        <Stat
          label="Taxa de ganho"
          value={winRate === null ? "—" : `${winRate}%`}
          hint="ganhos ÷ fechados"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="relative w-full max-w-sm">
          {statusFilter !== "all" ? (
            <input type="hidden" name="status" value={statusFilter} />
          ) : null}
          {pipelineParam ? <input type="hidden" name="pipeline" value={pipelineParam} /> : null}
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="text"
            name="q"
            defaultValue={term}
            placeholder="Buscar pelo título do negócio..."
            className="w-full rounded-md border border-border-1 bg-oxford-white py-2 pl-9 pr-3 text-sm focus:border-border-brand focus:outline-none"
          />
        </form>

        {pipelines && pipelines.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={hrefWith({ pipeline: null })}
              className={`rounded-full px-3 py-1 text-xs ${
                !pipelineParam ? "bg-oxford-blue text-white" : "bg-bg-surface-2 text-fg-2"
              }`}
            >
              Todos os funis
            </Link>
            {pipelines.map((p) => (
              <Link
                key={p.id}
                href={hrefWith({ pipeline: p.id })}
                className={`rounded-full px-3 py-1 text-xs ${
                  p.id === pipelineParam ? "bg-oxford-blue text-white" : "bg-bg-surface-2 text-fg-2"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {truncated ? (
        <p className="mb-3 text-xs text-fg-3">
          Mostrando os {rows.length} mais recentes de {count}. Use a busca ou o filtro de funil para
          refinar.
        </p>
      ) : null}

      <ClosedDealsTable
        deals={visible}
        stages={stageOptions}
        hideStatuses={statusFilter === "all" ? [] : [statusFilter]}
        emptyMessage={
          term || pipelineParam
            ? "Nenhum negócio corresponde aos filtros."
            : statusFilter === "won"
              ? "Nenhum negócio ganho ainda."
              : statusFilter === "lost"
                ? "Nenhum negócio perdido ainda."
                : "Nenhum negócio fechado ainda."
        }
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white px-4 py-3">
      <p className="text-xs text-fg-3">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-fg-1 tabular-nums">{value}</p>
      <p className="text-xs text-fg-3">{hint}</p>
    </div>
  );
}
