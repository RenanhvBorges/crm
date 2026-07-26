"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function createWidget(input: {
  title: string;
  widgetType: "stat" | "funnel";
  config: Json;
}) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("dashboard_widgets")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("dashboard_widgets").insert({
    title: input.title,
    widget_type: input.widgetType,
    config: input.config,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteWidget(widgetId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dashboard_widgets")
    .delete()
    .eq("id", widgetId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function reorderWidgets(orderedIds: string[]) {
  const supabase = await createClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("dashboard_widgets").update({ sort_order: index }).eq("id", id),
    ),
  );

  revalidatePath("/");
}

// Seeds a sensible starter dashboard the first time a user opens it, so the
// page is never empty on first visit. Idempotent: only runs when the user has
// no widgets yet.
export async function seedDefaultWidgets() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("dashboard_widgets")
    .select("*", { count: "exact", head: true });

  if ((count ?? 0) > 0) return;

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();

  const defaults: {
    title: string;
    widget_type: "stat" | "funnel";
    config: Json;
    sort_order: number;
  }[] = [
    {
      title: "Contatos",
      widget_type: "stat",
      config: {
        entity: "contacts",
        aggregation: "count",
        period: "all",
        periodField: "created_at",
        filters: {},
      },
      sort_order: 0,
    },
    {
      title: "Negócios em aberto",
      widget_type: "stat",
      config: {
        entity: "deals",
        aggregation: "count",
        period: "all",
        periodField: "created_at",
        filters: { dealStatus: "open" },
      },
      sort_order: 1,
    },
    {
      title: "Ganhos no mês",
      widget_type: "stat",
      config: {
        entity: "deals",
        aggregation: "sum_value",
        period: "this_month",
        periodField: "closed_at",
        filters: { dealStatus: "won" },
      },
      sort_order: 2,
    },
    {
      title: "Tarefas pendentes",
      widget_type: "stat",
      config: {
        entity: "tasks",
        aggregation: "count",
        period: "all",
        periodField: "created_at",
        filters: { taskStatus: "pending" },
      },
      sort_order: 3,
    },
  ];

  if (pipeline) {
    defaults.push({
      title: "Funil de vendas",
      widget_type: "funnel",
      config: { pipelineId: pipeline.id },
      sort_order: 4,
    });
  }

  await supabase.from("dashboard_widgets").insert(defaults);
  revalidatePath("/");
}
