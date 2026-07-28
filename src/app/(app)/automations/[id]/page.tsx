import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { describeTrigger } from "@/lib/automations/triggers";

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .single();
  if (!automation) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl">{automation.name}</h1>
      <p className="mb-6 text-sm text-fg-3">
        {describeTrigger(automation.trigger_type, automation.trigger_config)}
      </p>
      <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <p className="text-sm text-fg-muted">O builder visual do fluxo chega no próximo passo.</p>
      </div>
    </div>
  );
}
