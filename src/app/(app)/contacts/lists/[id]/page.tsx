import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { ListMemberPicker } from "@/components/list-member-picker";
import { ContactsTable } from "@/components/contacts-table";
import {
  availableColumns,
  DEFAULT_VISIBLE_COLUMNS,
  type ContactRow,
  type ViewConfig,
} from "@/lib/contact-columns";
import {
  renameList,
  deleteList,
  addContactsToList,
  removeContactFromList,
} from "../actions";
import { saveViewPreferences } from "../../view-actions";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const viewKey = `list:${id}`;

  const [
    { data: list },
    { data: members },
    { data: allContacts },
    { data: fieldDefs },
    { data: tiers },
    { data: pref },
    { data: tagCatalog },
    { data: lists },
  ] = await Promise.all([
    supabase.from("contact_lists").select("*").eq("id", id).single(),
    supabase
      .from("contact_list_members")
      .select(
        "added_at, contact:contacts(id, name, email, phone, company, tags, score, custom_fields)",
      )
      .eq("list_id", id)
      .order("added_at", { ascending: false }),
    supabase.from("contacts").select("id, name, email").order("name"),
    supabase
      .from("custom_field_definitions")
      .select("key, label, field_type")
      .eq("entity", "contact")
      .order("sort_order"),
    supabase.from("scoring_tiers").select("*").order("min_score"),
    supabase
      .from("contact_view_preferences")
      .select("config")
      .eq("view_key", viewKey)
      .maybeSingle(),
    supabase.from("tags").select("name, color").order("name"),
    supabase.from("contact_lists").select("id, name").order("sort_order"),
  ]);

  if (!list) {
    notFound();
  }

  const memberRows = (members ?? []).filter((row) => row.contact);
  const memberIds = new Set(memberRows.map((row) => row.contact!.id));
  const candidates = (allContacts ?? []).filter((c) => !memberIds.has(c.id));

  const rows: ContactRow[] = memberRows.map((row) => {
    const c = row.contact!;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      tags: c.tags,
      score: c.score,
      custom_fields: (c.custom_fields ?? {}) as Record<string, unknown>,
    };
  });

  const allColumns = availableColumns(fieldDefs ?? []);
  const initialConfig =
    (pref?.config as ViewConfig | null) ?? {
      columns: DEFAULT_VISIBLE_COLUMNS,
      filters: [],
    };

  // Server actions vinculadas a esta lista, reutilizando o botão genérico.
  async function removeMember(contactId: string) {
    "use server";
    await removeContactFromList(id, contactId);
  }
  const renameThisList = renameList.bind(null, id);

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/contacts/lists"
        className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-1"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Listas
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl">{list.name}</h1>
          <p className="text-sm text-fg-3">
            {memberRows.length} {memberRows.length === 1 ? "contato" : "contatos"}
            {list.description ? ` · ${list.description}` : ""}
          </p>
        </div>
        <DeleteFieldButton
          fieldId={list.id}
          deleteAction={deleteList}
          confirmMessage="Excluir esta lista? Os contatos não são apagados."
        />
      </div>

      <details className="rounded-lg border border-border-1 bg-oxford-white">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-fg-2">
          <Pencil size={15} strokeWidth={1.5} />
          Editar lista
        </summary>
        <form action={renameThisList} className="space-y-3 border-t border-border-1 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">Nome</label>
            <input
              name="name"
              required
              defaultValue={list.name}
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">Descrição</label>
            <input
              name="description"
              defaultValue={list.description ?? ""}
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
          >
            Salvar
          </button>
        </form>
      </details>

      <ListMemberPicker
        listId={list.id}
        candidates={candidates}
        addAction={addContactsToList}
      />

      <ContactsTable
        viewKey={viewKey}
        contacts={rows}
        allColumns={allColumns}
        tiers={tiers ?? []}
        initialConfig={initialConfig}
        saveAction={saveViewPreferences}
        removeAction={removeMember}
        removeConfirmMessage="Remover este contato da lista?"
        bulk={{ tagCatalog: tagCatalog ?? [], lists: lists ?? [], currentListId: list.id }}
      />
    </div>
  );
}
