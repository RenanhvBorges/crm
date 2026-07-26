import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { periodStart, type WidgetPeriod } from "@/lib/dashboard";

export type BaseMetric =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed";

// Cada métrica base mapeia 1:1 para a coluna de timestamp correspondente em
// email_campaign_recipients — "aconteceu" = coluna preenchida.
const METRIC_COLUMN: Record<BaseMetric, string> = {
  sent: "sent_at",
  delivered: "delivered_at",
  opened: "opened_at",
  clicked: "clicked_at",
  bounced: "bounced_at",
  complained: "complained_at",
  unsubscribed: "unsubscribed_at",
};

export const BASE_METRICS: { value: BaseMetric; label: string }[] = [
  { value: "sent", label: "Enviados" },
  { value: "delivered", label: "Entregues" },
  { value: "opened", label: "Aberturas" },
  { value: "clicked", label: "Cliques" },
  { value: "bounced", label: "Bounces" },
  { value: "complained", label: "Denúncias de spam" },
  { value: "unsubscribed", label: "Descadastros" },
];

export type StatConfig = {
  metric: BaseMetric;
  scope: "all" | "campaign";
  campaignId?: string;
  period: WidgetPeriod;
};

export type FormulaOperator = "+" | "-" | "*" | "/";

export type FormulaConfig = {
  metricA: StatConfig;
  operator: FormulaOperator;
  metricB: StatConfig;
  asPercent?: boolean;
};

type Client = SupabaseClient<Database>;

export async function computeEmailStatWidget(
  supabase: Client,
  config: StatConfig,
): Promise<number> {
  const column = METRIC_COLUMN[config.metric];

  let query = supabase
    .from("email_campaign_recipients")
    .select("*", { count: "exact", head: true })
    .not(column, "is", null);

  if (config.scope === "campaign" && config.campaignId) {
    query = query.eq("campaign_id", config.campaignId);
  }

  const start = periodStart(config.period);
  if (start) query = query.gte(column, start);

  const { count } = await query;
  return count ?? 0;
}

// Resultado null representa divisão por zero ("—" na UI) — não há
// eval/exec de código do usuário, é só duas leituras + um operador fixo.
export async function computeEmailFormulaWidget(
  supabase: Client,
  config: FormulaConfig,
): Promise<number | null> {
  const [a, b] = await Promise.all([
    computeEmailStatWidget(supabase, config.metricA),
    computeEmailStatWidget(supabase, config.metricB),
  ]);

  let result: number | null;
  switch (config.operator) {
    case "+":
      result = a + b;
      break;
    case "-":
      result = a - b;
      break;
    case "*":
      result = a * b;
      break;
    case "/":
      result = b === 0 ? null : a / b;
      break;
  }

  if (result !== null && config.asPercent) result *= 100;
  return result;
}

export function formatEmailMetricValue(value: number | null, asPercent?: boolean): string {
  if (value === null) return "—";
  if (asPercent) return `${value.toFixed(1)}%`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
