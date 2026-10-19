import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskQuickAddForm } from "@/components/task-quick-add-form";
import { TaskList } from "@/components/task-list";

const FILTERS = [
  { value: "pending", label: "Pendentes" },
  { value: "done", label: "Concluídas" },
  { value: "all", label: "Todas" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; scope?: string }>;
}) {
  const { filter = "pending", scope: scopeParam } = await searchParams;
  const supabase = await createClient();

  // src/proxy.ts já garante uma sessão autenticada em qualquer rota fora de
  // /login, então user nunca é null aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [{ data: profiles }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role").order("full_name"),
    supabase.from("contacts").select("id, name").order("name"),
    supabase.from("deals").select("id, title").order("title"),
  ]);

  // Papel resolvido a partir do roster já carregado (evita uma query extra só
  // pra checar o próprio role). "Toda a equipe" é forçado de volta pra "mine"
  // no servidor se o usuário não for diretor_comercial — não dá pra contornar
  // editando a URL.
  const isDirector = profiles?.find((p) => p.id === userId)?.role === "diretor_comercial";
  const scope = isDirector && scopeParam === "all" ? "all" : "mine";

  let query = supabase
    .from("tasks")
    .select(
      "id, title, due_date, status, contact:contacts(id, name), deal:deals(id, title), assignee:profiles(id, full_name, email)",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }
  if (scope === "mine") {
    query = query.eq("assigned_to", userId);
  }

  const { data: tasks } = await query;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl">Tarefas</h1>

      <div className="mb-6 rounded-lg border border-border-1 bg-oxford-white p-4">
        <TaskQuickAddForm
          currentUserId={userId}
          profiles={profiles ?? []}
          contacts={contacts ?? []}
          deals={deals ?? []}
        />
      </div>

      {isDirector ? (
        <div className="mb-3 flex gap-2 text-sm">
          <Link
            href={`/tasks?filter=${filter}&scope=mine`}
            className={`rounded-full px-3 py-1 ${
              scope === "mine"
                ? "bg-oxford-blue text-white"
                : "bg-bg-surface-2 text-fg-2 hover:bg-oxford-blue-50"
            }`}
          >
            Minhas tarefas
          </Link>
          <Link
            href={`/tasks?filter=${filter}&scope=all`}
            className={`rounded-full px-3 py-1 ${
              scope === "all"
                ? "bg-oxford-blue text-white"
                : "bg-bg-surface-2 text-fg-2 hover:bg-oxford-blue-50"
            }`}
          >
            Toda a equipe
          </Link>
        </div>
      ) : null}

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/tasks?filter=${f.value}&scope=${scope}`}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f.value
                ? "bg-oxford-blue text-white"
                : "bg-bg-surface-2 text-fg-2 hover:bg-oxford-blue-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-border-1 bg-oxford-white px-4">
        <TaskList
          tasks={tasks ?? []}
          profiles={profiles ?? []}
          contacts={contacts ?? []}
          deals={deals ?? []}
          bulk
        />
      </div>
    </div>
  );
}
