import { createClient } from "@/lib/supabase/server";
import { NewAutomationForm } from "./new-automation-form";

export default async function NewAutomationPage() {
  const supabase = await createClient();

  const [{ data: tags }, { data: lists }, { data: pipelines }, { data: stages }, { data: campaigns }] =
    await Promise.all([
      supabase.from("tags").select("name").order("name"),
      supabase.from("contact_lists").select("id, name").order("sort_order"),
      supabase.from("pipelines").select("id, name").order("sort_order"),
      supabase.from("pipeline_stages").select("id, name, pipeline_id").order("sort_order"),
      supabase.from("email_campaigns").select("id, name").eq("is_system", false).order("created_at", { ascending: false }),
    ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl">Nova automação</h1>
      <p className="mb-6 text-sm text-fg-3">
        Escolha o gatilho de entrada. Os passos do fluxo são montados na próxima tela.
      </p>

      <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <NewAutomationForm
          catalogs={{
            tags: tags ?? [],
            lists: lists ?? [],
            pipelines: pipelines ?? [],
            stages: stages ?? [],
            campaigns: campaigns ?? [],
          }}
        />
      </div>
    </div>
  );
}
