import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DealForm } from "@/components/deal-form";
import { DeleteDealButton } from "@/components/delete-deal-button";
import { TaskQuickAddForm } from "@/components/task-quick-add-form";
import { TaskList } from "@/components/task-list";
import { DealContactCard } from "@/components/deal-contact-card";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    supabase.from("custom_field_definitions").select("*").eq("entity", "deal").order("sort_order"),
    supabase.from("custom_field_groups").select("*").eq("entity", "deal").order("sort_order"),
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

  // O contato vinculado (dados completos) só dá para buscar depois de saber o
  // contact_id do negócio.
  const [
    { data: contact },
    { data: contactFieldDefs },
    { data: tagCatalog },
    { data: scoringTiers },
    { data: otherDeals },
  ] = await Promise.all([
    deal.contact_id
      ? supabase.from("contacts").select("*").eq("id", deal.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase.from("tags").select("name, color").order("name"),
    supabase.from("scoring_tiers").select("*").order("min_score"),
    deal.contact_id
      ? supabase
          .from("deals")
          .select("id, title, value, status")
          .eq("contact_id", deal.contact_id)
          .neq("id", deal.id)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const formPipelines = (pipelines ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stages: [...p.pipeline_stages]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ id: s.id, name: s.name })),
  }));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{deal.title}</h1>
        <DeleteDealButton dealId={deal.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-8">
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

        <aside className="min-w-0 lg:sticky lg:top-8">
          <DealContactCard
            contact={contact}
            fieldDefinitions={contactFieldDefs ?? []}
            tagCatalog={tagCatalog ?? []}
            tiers={scoringTiers ?? []}
            otherDeals={(otherDeals ?? []).map((d) => ({ ...d, value: Number(d.value) || 0 }))}
          />
        </aside>
      </div>
    </div>
  );
}
