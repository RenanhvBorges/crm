"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function createMetricWidget(input: {
  title: string;
  widgetType: "stat" | "formula";
  config: Json;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { count } = await supabase
    .from("email_metric_widgets")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("email_metric_widgets").insert({
    title: input.title,
    widget_type: input.widgetType,
    config: input.config,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/marketing/metrics");
}

export async function deleteMetricWidget(widgetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("email_metric_widgets").delete().eq("id", widgetId);
  if (error) throw new Error(error.message);
  revalidatePath("/marketing/metrics");
}

export async function reorderMetricWidgets(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("email_metric_widgets").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/marketing/metrics");
}

// Semeia um dashboard inicial na primeira visita, pra tela nunca ficar vazia.
export async function seedDefaultMetricWidgets() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("email_metric_widgets")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const defaults: {
    title: string;
    widget_type: "stat" | "formula";
    config: Json;
    sort_order: number;
  }[] = [
    {
      title: "E-mails enviados",
      widget_type: "stat",
      config: { metric: "sent", scope: "all", period: "all" },
      sort_order: 0,
    },
    {
      title: "Taxa de abertura",
      widget_type: "formula",
      config: {
        metricA: { metric: "opened", scope: "all", period: "all" },
        operator: "/",
        metricB: { metric: "sent", scope: "all", period: "all" },
        asPercent: true,
      },
      sort_order: 1,
    },
    {
      title: "Taxa de cliques",
      widget_type: "formula",
      config: {
        metricA: { metric: "clicked", scope: "all", period: "all" },
        operator: "/",
        metricB: { metric: "sent", scope: "all", period: "all" },
        asPercent: true,
      },
      sort_order: 2,
    },
  ];

  await supabase.from("email_metric_widgets").insert(defaults);
  revalidatePath("/marketing/metrics");
}
