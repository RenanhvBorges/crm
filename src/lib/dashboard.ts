import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type WidgetEntity = "contacts" | "deals" | "tasks";
export type WidgetAggregation = "count" | "sum_value" | "avg_value";
export type WidgetPeriod =
  | "all"
  | "this_week"
  | "this_month"
  | "last_7"
  | "last_30"
  | "last_90";

export type StatWidgetConfig = {
  entity: WidgetEntity;
  aggregation: WidgetAggregation;
  period: WidgetPeriod;
  periodField: string;
  filters: {
    dealStatus?: "open" | "won" | "lost";
    pipelineId?: string;
    stageId?: string;
    taskStatus?: "pending" | "done";
    tag?: string;
  };
};

export type FunnelWidgetConfig = {
  pipelineId: string;
};

export const ENTITIES: { value: WidgetEntity; label: string }[] = [
  { value: "contacts", label: "Contatos" },
  { value: "deals", label: "Negócios" },
  { value: "tasks", label: "Tarefas" },
];

export const AGGREGATIONS: { value: WidgetAggregation; label: string }[] = [
  { value: "count", label: "Quantidade" },
  { value: "sum_value", label: "Soma do valor (R$)" },
  { value: "avg_value", label: "Valor médio (R$)" },
];

export const PERIODS: { value: WidgetPeriod; label: string }[] = [
  { value: "all", label: "Todo o período" },
  { value: "this_week", label: "Esta semana" },
  { value: "this_month", label: "Este mês" },
  { value: "last_7", label: "Últimos 7 dias" },
  { value: "last_30", label: "Últimos 30 dias" },
  { value: "last_90", label: "Últimos 90 dias" },
];

// Which date field a period can be measured against, per entity.
export const PERIOD_FIELDS: Record<WidgetEntity, { value: string; label: string }[]> = {
  contacts: [{ value: "created_at", label: "Data de criação" }],
  deals: [
    { value: "created_at", label: "Data de criação" },
    { value: "closed_at", label: "Data de fechamento" },
  ],
  tasks: [
    { value: "created_at", label: "Data de criação" },
    { value: "due_date", label: "Data de vencimento" },
    { value: "completed_at", label: "Data de conclusão" },
  ],
};

export function periodStart(period: WidgetPeriod): string | null {
  if (period === "all") return null;
  const now = new Date();
  const d = new Date();
  switch (period) {
    case "this_week": {
      const day = (now.getDay() + 6) % 7; // Monday = 0
      d.setDate(now.getDate() - day);
      d.setHours(0, 0, 0, 0);
      break;
    }
    case "this_month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case "last_7":
      d.setDate(now.getDate() - 7);
      break;
    case "last_30":
      d.setDate(now.getDate() - 30);
      break;
    case "last_90":
      d.setDate(now.getDate() - 90);
      break;
  }
  return d.toISOString();
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatWidgetValue(
  aggregation: WidgetAggregation,
  value: number,
): string {
  if (aggregation === "count") return String(value);
  return currency.format(value);
}

type Client = SupabaseClient<Database>;

export async function computeStatWidget(
  supabase: Client,
  config: StatWidgetConfig,
): Promise<number> {
  const { entity, aggregation, filters } = config;
  const isSumOrAvg = aggregation !== "count";

  // Only deals carry a monetary value; sum/avg on other entities is meaningless.
  if (isSumOrAvg && entity !== "deals") {
    return 0;
  }

  // Table name and filter columns are driven by runtime widget config, so the
  // strictly-typed client can't narrow them — build the filter chain loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from(entity)
    .select(isSumOrAvg ? "value" : "id", {
      count: isSumOrAvg ? undefined : "exact",
      head: !isSumOrAvg,
    });

  const start = periodStart(config.period);
  if (start && config.periodField) {
    query = query.gte(config.periodField, start);
  }

  if (entity === "deals") {
    if (filters.dealStatus) query = query.eq("status", filters.dealStatus);
    if (filters.pipelineId) query = query.eq("pipeline_id", filters.pipelineId);
    if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  }
  if (entity === "tasks" && filters.taskStatus) {
    query = query.eq("status", filters.taskStatus);
  }
  if (entity === "contacts" && filters.tag) {
    query = query.contains("tags", [filters.tag]);
  }

  if (!isSumOrAvg) {
    const { count } = await query;
    return count ?? 0;
  }

  const { data } = await query;
  const rows = (data ?? []) as { value: number }[];
  if (!rows.length) return 0;
  const total = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  return aggregation === "sum_value" ? total : total / rows.length;
}

export type FunnelRow = {
  stageId: string;
  name: string;
  color: string;
  openCount: number;
  openValue: number;
  everEntered: number;
  conversionRate: number;
};

export async function computeFunnelWidget(
  supabase: Client,
  config: FunnelWidgetConfig,
): Promise<{ pipelineName: string; rows: FunnelRow[] } | null> {
  if (!config.pipelineId) return null;

  const [{ data: pipeline }, { data: stages }, { data: openDeals }] =
    await Promise.all([
      supabase.from("pipelines").select("name").eq("id", config.pipelineId).single(),
      supabase
        .from("pipeline_stages")
        .select("id, name, color")
        .eq("pipeline_id", config.pipelineId)
        .order("sort_order"),
      supabase
        .from("deals")
        .select("value, stage_id")
        .eq("pipeline_id", config.pipelineId)
        .eq("status", "open"),
    ]);

  if (!stages?.length) return null;

  const byStage = new Map<string, { count: number; value: number }>();
  for (const deal of openDeals ?? []) {
    const cur = byStage.get(deal.stage_id) ?? { count: 0, value: 0 };
    byStage.set(deal.stage_id, {
      count: cur.count + 1,
      value: cur.value + deal.value,
    });
  }

  const { data: history } = await supabase
    .from("deal_stage_history")
    .select("deal_id, stage_id")
    .in(
      "stage_id",
      stages.map((s) => s.id),
    );

  const totalDeals = new Set((history ?? []).map((h) => h.deal_id)).size;

  const rows: FunnelRow[] = stages.map((stage) => {
    const stageData = byStage.get(stage.id) ?? { count: 0, value: 0 };
    const everEntered = new Set(
      (history ?? []).filter((h) => h.stage_id === stage.id).map((h) => h.deal_id),
    ).size;
    return {
      stageId: stage.id,
      name: stage.name,
      color: stage.color,
      openCount: stageData.count,
      openValue: stageData.value,
      everEntered,
      conversionRate: totalDeals > 0 ? Math.round((everEntered / totalDeals) * 100) : 0,
    };
  });

  return { pipelineName: pipeline?.name ?? "Funil", rows };
}
