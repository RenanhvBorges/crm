import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/contact-form";
import { TaskQuickAddForm } from "@/components/task-quick-add-form";
import { TaskList } from "@/components/task-list";
import { DeleteContactButton } from "@/components/delete-contact-button";
import { ScoreBadge } from "@/components/score-badge";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ContactDetailPage({
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
    { data: contact },
    { data: fieldDefinitions },
    { data: fieldGroups },
    { data: tagCatalog },
    { data: deals },
    { data: tasks },
    { data: scoringTiers },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).single(),
    supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase
      .from("custom_field_groups")
      .select("*")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase.from("tags").select("name, color").order("name"),
    supabase
      .from("deals")
      .select("id, title, value, status, pipeline_stage:pipeline_stages(name)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, due_date, status, assignee:profiles(id, full_name, email)")
      .eq("contact_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("scoring_tiers").select("*").order("min_score"),
    supabase.from("profiles").select("id, email, full_name").order("full_name"),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl">{contact.name}</h1>
          <ScoreBadge score={contact.score} tiers={scoringTiers ?? []} />
        </div>
        <DeleteContactButton contactId={contact.id} />
      </div>

      <section className="rounded-lg border border-border-1 bg-oxford-white p-6">
        <ContactForm
          contact={contact}
          fieldDefinitions={fieldDefinitions ?? []}
          fieldGroups={fieldGroups ?? []}
          tagCatalog={tagCatalog ?? []}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg">Negócios</h2>
        <div className="rounded-lg border border-border-1 bg-oxford-white">
          {deals?.length ? (
            <ul className="divide-y divide-border-1">
              {deals.map((deal) => {
                const stage = Array.isArray(deal.pipeline_stage)
                  ? deal.pipeline_stage[0]
                  : deal.pipeline_stage;
                return (
                  <li key={deal.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <Link href="/deals" className="text-sm font-medium text-fg-brand hover:underline">
                        {deal.title}
                      </Link>
                      <p className="text-xs text-fg-3">{stage?.name ?? deal.status}</p>
                    </div>
                    <span className="text-sm text-fg-accent">{currency.format(deal.value)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              Nenhum negócio vinculado.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Tarefas</h2>
        <div className="mb-3 rounded-lg border border-border-1 bg-oxford-white p-4">
          <TaskQuickAddForm
            contactId={contact.id}
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
