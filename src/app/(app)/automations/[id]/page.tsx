import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseFlow } from "@/lib/automations/flow";
import { AutomationBuilderClient } from "./automation-builder-client";
import { HistoryPanel, type EnrollmentRow } from "./history-panel";

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
    { data: adConversions },
  ] = await Promise.all([
    supabase.from("automations").select("*").eq("id", id).single(),
    supabase.from("tags").select("name").order("name"),
    supabase.from("contact_lists").select("id, name").order("sort_order"),
    supabase.from("pipelines").select("id, name").order("sort_order"),
    supabase.from("pipeline_stages").select("id, name, pipeline_id").order("sort_order"),
    supabase.from("email_campaigns").select("id, name").eq("is_system", false).order("created_at", { ascending: false }),
    supabase.from("email_templates").select("id, name, subject").order("name"),
    supabase
      .from("custom_field_definitions")
      .select("key, label")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name, email").order("email"),
    supabase
      .from("ad_conversions")
      .select("id, name, is_active, google_conversion_action_id, meta_event_name")
      .order("name"),
  ]);

  if (!automation) notFound();

  // Últimas inscrições + seus passos, para a seção de histórico.
  const { data: enrollments } = await supabase
    .from("automation_enrollments")
    .select("id, status, created_at, wait_until, error_message, contact_id, contacts(name)")
    .eq("automation_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);
  const { data: steps } = enrollmentIds.length
    ? await supabase
        .from("automation_step_logs")
        .select("id, enrollment_id, node_type, status, detail, executed_at")
        .in("enrollment_id", enrollmentIds)
        .order("executed_at")
    : { data: [] };

  const stepsByEnrollment = new Map<string, EnrollmentRow["steps"]>();
  for (const s of steps ?? []) {
    const list = stepsByEnrollment.get(s.enrollment_id) ?? [];
    list.push(s);
    stepsByEnrollment.set(s.enrollment_id, list);
  }

  const history: EnrollmentRow[] = (enrollments ?? []).map((e) => ({
    id: e.id,
    status: e.status,
    created_at: e.created_at,
    wait_until: e.wait_until,
    error_message: e.error_message,
    contactName: e.contacts?.name ?? "Contato removido",
    steps: stepsByEnrollment.get(e.id) ?? [],
  }));

  return (
    <div className="space-y-8">
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
        adConversions: (adConversions ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          is_active: c.is_active,
          google: Boolean(c.google_conversion_action_id),
          meta: Boolean(c.meta_event_name),
        })),
      }}
      />
      <HistoryPanel enrollments={history} />
    </div>
  );
}
