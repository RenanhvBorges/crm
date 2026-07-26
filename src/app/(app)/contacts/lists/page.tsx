import Link from "next/link";
import { List } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createList, deleteList } from "./actions";
import { DeleteFieldButton } from "@/components/delete-field-button";

export default async function ContactListsPage() {
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("contact_lists")
    .select("id, name, description, contact_list_members(count)")
    .order("sort_order");

  function memberCount(list: { contact_list_members: { count: number }[] }) {
    return list.contact_list_members?.[0]?.count ?? 0;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Listas</h1>
      <p className="mb-6 text-sm text-fg-3">
        Agrupe contatos em listas. Os membros são adicionados manualmente.
      </p>

      <div className="mb-6 rounded-lg border border-border-1 bg-oxford-white">
        {lists?.length ? (
          <ul className="divide-y divide-border-1">
            {lists.map((list) => {
              const count = memberCount(list);
              return (
                <li
                  key={list.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <List
                      size={18}
                      strokeWidth={1.5}
                      className="mt-0.5 shrink-0 text-fg-3"
                    />
                    <div>
                      <Link
                        href={`/contacts/lists/${list.id}`}
                        className="text-sm font-medium text-fg-brand hover:underline"
                      >
                        {list.name}
                      </Link>
                      <p className="text-xs text-fg-3">
                        {count} {count === 1 ? "contato" : "contatos"}
                        {list.description ? ` · ${list.description}` : ""}
                      </p>
                    </div>
                  </div>
                  <DeleteFieldButton
                    fieldId={list.id}
                    deleteAction={deleteList}
                    confirmMessage="Excluir esta lista? Os contatos não são apagados."
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Nenhuma lista criada ainda.
          </p>
        )}
      </div>

      <form
        action={createList}
        className="space-y-4 rounded-lg border border-border-1 bg-oxford-white p-4"
      >
        <h3 className="text-sm font-semibold text-fg-2">Nova lista</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">Nome</label>
          <input
            name="name"
            required
            placeholder="ex: Clientes VIP"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">
            Descrição (opcional)
          </label>
          <input
            name="description"
            placeholder="Para que serve esta lista?"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Criar lista
        </button>
      </form>
    </div>
  );
}
