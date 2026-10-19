import Link from "next/link";
import { LayoutTemplate, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { SelectableList } from "@/components/bulk/selectable-list";
import { bulkDeleteTemplates, createTemplate, deleteTemplate, duplicateTemplate } from "./actions";

export default async function EmailTemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("email_templates")
    .select("id, name, subject, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Templates de e-mail</h1>
      <p className="mb-6 text-sm text-fg-3">
        Modelos reutilizáveis para campanhas, com editor de blocos arrastáveis.
      </p>

      <div className="mb-6">
        <SelectableList
          singular="template"
          plural="templates"
          emptyMessage="Nenhum template criado ainda."
          actions={[
            {
              key: "delete",
              label: "Excluir",
              danger: true,
              run: bulkDeleteTemplates,
              confirm: "Excluir {count} template(s)?",
            },
          ]}
          rows={(templates ?? []).map((t) => ({
            id: t.id,
            content: (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-start gap-3">
                  <LayoutTemplate size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-3" />
                  <div>
                    <Link
                      href={`/marketing/templates/${t.id}`}
                      className="text-sm font-medium text-fg-brand hover:underline"
                    >
                      {t.name}
                    </Link>
                    {t.subject ? <p className="text-xs text-fg-3">{t.subject}</p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <form action={duplicateTemplate.bind(null, t.id)}>
                    <button
                      type="submit"
                      className="text-fg-muted hover:text-fg-2"
                      aria-label="Duplicar"
                    >
                      <Copy size={16} strokeWidth={1.5} />
                    </button>
                  </form>
                  <DeleteFieldButton
                    fieldId={t.id}
                    deleteAction={deleteTemplate}
                    confirmMessage="Excluir este template?"
                  />
                </div>
              </div>
            ),
          }))}
        />
      </div>

      <form
        action={createTemplate}
        className="space-y-4 rounded-lg border border-border-1 bg-oxford-white p-4"
      >
        <h3 className="text-sm font-semibold text-fg-2">Novo template</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">Nome</label>
          <input
            name="name"
            required
            placeholder="ex: Boas-vindas"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">
            Assunto padrão (opcional)
          </label>
          <input
            name="subject"
            placeholder="Pode ser ajustado depois, por campanha"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Criar template
        </button>
      </form>
    </div>
  );
}
