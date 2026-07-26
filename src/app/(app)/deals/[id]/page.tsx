import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DealForm } from "@/components/deal-form";
import { DeleteDealButton } from "@/components/delete-deal-button";
import { TaskQuickAddForm } from "@/components/task-quick-add-form";
import { TaskList } from "@/components/task-list";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // src/proxy.ts já garante uma sessão autenticada em qualquer rota fora de
  // /login, então user nunca é null aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: deal },
    { data: pipelines },
    { data: contacts },
    { data: fieldDefinitions },
    { data: fieldGroups },
    { data: tasks },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("deals").select("*").eq("id", id).single(),
    supabase
      .from("pipelines")
      .select("id, name, pipeline_stages(id, name, sort_order)")
      .order("sort_order"),
    supabase.from("contacts").select("id, name").order("name"),
    supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("entity", "deal")
      .order("sort_order"),
    supabase
      .from("custom_field_groups")
      .select("*")
      .eq("entity", "deal")
      .order("sort_order"),
    supabase
      .from("tasks")
      .select("id, title, due_date, status, assignee:profiles(id, full_name, email)")
      .eq("deal_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id, email, full_name").order("full_name"),
  ]);

  if (!deal) {
    notFound();
  }

  const formPipelines = (pipelines ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stages: [...p.pipeline_stages]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ id: s.id, name: s.name })),
  }));

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{deal.title}</h1>
        <DeleteDealButton dealId={deal.id} />
      </div>

      <section className="rounded-lg border border-border-1 bg-oxford-white p-6">
        <DealForm
          deal={deal}
          pipelines={formPipelines}
          contacts={contacts ?? []}
          fieldDefinitions={fieldDefinitions ?? []}
          fieldGroups={fieldGroups ?? []}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg">Tarefas</h2>
        <div className="mb-3 rounded-lg border border-border-1 bg-oxford-white p-4">
          <TaskQuickAddForm
            dealId={deal.id}
            currentUserId={user!.id}
            profiles={profiles ?? []}
          />
        </div>
        <div className="rounded-lg border border-border-1 bg-oxford-white px-4">
          <TaskList tasks={tasks ?? []} profiles={profiles ?? []} />
        </div>
      </section>
    </div>
  );
}
