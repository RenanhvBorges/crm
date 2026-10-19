import { createClient } from "@/lib/supabase/server";
import { bulkDeleteTags, createTag, updateTag, deleteTag } from "./actions";
import { TagRow } from "@/components/tag-row";
import { SelectableList } from "@/components/bulk/selectable-list";

export default async function ContactTagsPage() {
  const supabase = await createClient();
  const [{ data: tags }, { data: contacts }] = await Promise.all([
    supabase.from("tags").select("*").order("name"),
    supabase.from("contacts").select("tags"),
  ]);

  // Contagem de uso por nome de tag (contacts.tags guarda os nomes).
  const usage = new Map<string, number>();
  for (const contact of contacts ?? []) {
    for (const tag of contact.tags ?? []) {
      usage.set(tag, (usage.get(tag) ?? 0) + 1);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Tags</h1>
      <p className="mb-6 text-sm text-fg-3">
        Crie e gerencie as tags. A atribuição continua sendo feita no contato.
      </p>

      <div className="mb-6">
        <SelectableList
          singular="tag"
          plural="tags"
          emptyMessage="Nenhuma tag criada ainda."
          actions={[
            {
              key: "delete",
              label: "Excluir",
              danger: true,
              run: bulkDeleteTags,
              confirm: "Excluir {count} tag(s)? Elas serão removidas de todos os contatos.",
            },
          ]}
          rows={(tags ?? []).map((tag) => ({
            id: tag.id,
            content: (
              <TagRow
                tag={tag}
                usageCount={usage.get(tag.name) ?? 0}
                updateAction={updateTag}
                deleteAction={deleteTag}
              />
            ),
          }))}
        />
      </div>

      <form
        action={createTag}
        className="flex items-end gap-2 rounded-lg border border-border-1 bg-oxford-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">Cor</label>
          <input
            name="color"
            type="color"
            defaultValue="#263fa3"
            className="h-9 w-12 rounded-md border border-border-1"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-fg-2">Nova tag</label>
          <input
            name="name"
            required
            placeholder="ex: quente"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Adicionar
        </button>
      </form>
    </div>
  );
}
