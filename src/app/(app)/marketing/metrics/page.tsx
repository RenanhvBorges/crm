import { createClient } from "@/lib/supabase/server";
import {
  computeEmailStatWidget,
  computeEmailFormulaWidget,
  type StatConfig,
  type FormulaConfig,
} from "@/lib/email-metrics";
import { EmailMetricsClient, type ComputedMetricWidget } from "@/components/email-metrics-client";

export default async function EmailMetricsPage() {
  const supabase = await createClient();

  const [{ data: widgets }, { data: campaigns }] = await Promise.all([
    supabase
      .from("email_metric_widgets")
      .select("id, title, widget_type, config, sort_order")
      .order("sort_order"),
    supabase.from("email_campaigns").select("id, name").order("created_at", { ascending: false }),
  ]);

  const computed: ComputedMetricWidget[] = await Promise.all(
    (widgets ?? []).map(async (w) => {
      if (w.widget_type === "formula") {
        const value = await computeEmailFormulaWidget(
          supabase,
          w.config as unknown as FormulaConfig,
        );
        return {
          id: w.id,
          title: w.title,
          widgetType: "formula" as const,
          config: w.config,
          value,
        };
      }
      const value = await computeEmailStatWidget(supabase, w.config as unknown as StatConfig);
      return {
        id: w.id,
        title: w.title,
        widgetType: "stat" as const,
        config: w.config,
        value,
      };
    }),
  );

  return <EmailMetricsClient widgets={computed} campaigns={campaigns ?? []} />;
}
