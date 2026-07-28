import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseFlow } from "@/lib/automations/flow";
import { AutomationBuilderClient } from "./automation-builder-client";

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: automation },
    { data: tags },
    { data: lists },
    { data: pipelines },
    { data: stages },
    { data: campaigns },
    { data: templates },
    { data: fields },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("automations").select("*").eq("id", id).single(),
    supabase.from("tags").select("name").order("name"),
    supabase.from("contact_lists").select("id, name").order("sort_order"),
    supabase.from("pipelines").select("id, name").order("sort_order"),
    supabase.from("pipeline_stages").select("id, name, pipeline_id").order("sort_order"),
    supabase.from("email_campaigns").select("id, name").order("created_at", { ascending: false }),
    supabase.from("email_templates").select("id, name, subject").order("name"),
    supabase
      .from("custom_field_definitions")
      .select("key, label")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name, email").order("email"),
  ]);

  if (!automation) notFound();

  return (
    <AutomationBuilderClient
      automation={{
        id: automation.id,
        name: automation.name,
        status: automation.status,
        trigger_type: automation.trigger_type,
        trigger_config: automation.trigger_config,
        allow_reentry: automation.allow_reentry,
      }}
      initialFlow={parseFlow(automation.flow)}
      catalogs={{
        tags: tags ?? [],
        lists: lists ?? [],
        pipelines: pipelines ?? [],
        stages: stages ?? [],
        campaigns: campaigns ?? [],
        templates: templates ?? [],
        fields: fields ?? [],
        profiles: (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? p.email })),
      }}
    />
  );
}
