import { createClient } from "@/lib/supabase/server";
import {
  computeStatWidget,
  computeFunnelWidget,
  type StatWidgetConfig,
  type FunnelWidgetConfig,
  type FunnelRow,
} from "@/lib/dashboard";
import { DashboardClient, type ComputedWidget } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: widgets } = await supabase
    .from("dashboard_widgets")
    .select("id, title, widget_type, config, sort_order")
    .order("sort_order");

  const computed: ComputedWidget[] = await Promise.all(
    (widgets ?? []).map(async (w) => {
      if (w.widget_type === "funnel") {
        const funnel = await computeFunnelWidget(
          supabase,
          w.config as unknown as FunnelWidgetConfig,
        );
        return {
          id: w.id,
          title: w.title,
          widgetType: "funnel" as const,
          config: w.config,
          funnel,
          value: null as number | null,
        };
      }
      const value = await computeStatWidget(
        supabase,
        w.config as unknown as StatWidgetConfig,
      );
      return {
        id: w.id,
        title: w.title,
        widgetType: "stat" as const,
        config: w.config,
        value,
        funnel: null as { pipelineName: string; rows: FunnelRow[] } | null,
      };
    }),
  );

  // Options for the widget builder dropdowns.
  const [{ data: pipelines }, { data: stages }, { data: contacts }] = await Promise.all([
    supabase.from("pipelines").select("id, name").order("sort_order"),
    supabase.from("pipeline_stages").select("id, name, pipeline_id").order("sort_order"),
    supabase.from("contacts").select("tags"),
  ]);

  const tagSet = new Set<string>();
  for (const c of contacts ?? []) {
    for (const t of c.tags ?? []) tagSet.add(t);
  }

  return (
    <DashboardClient
      widgets={computed}
      pipelines={pipelines ?? []}
      stages={stages ?? []}
      tags={Array.from(tagSet).sort()}
    />
  );
}
