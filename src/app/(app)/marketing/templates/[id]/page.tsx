import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { PlaceholderTextInput } from "@/components/placeholder-text-input";
import { parseEmailDocument } from "@/lib/email-blocks";
import { listAvailablePlaceholders } from "@/lib/email-placeholders";
import { updateTemplateDetails, deleteTemplate } from "../actions";
import { TemplateEditorClient } from "./template-editor-client";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: template }, { data: fieldDefs }] = await Promise.all([
    supabase.from("email_templates").select("*").eq("id", id).single(),
    supabase.from("custom_field_definitions").select("*").eq("entity", "contact"),
  ]);

  if (!template) notFound();

  const placeholderOptions = listAvailablePlaceholders(fieldDefs ?? []);
  const updateDetails = updateTemplateDetails.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{template.name}</h1>
        <DeleteFieldButton
          fieldId={template.id}
          deleteAction={deleteTemplate}
          confirmMessage="Excluir este template?"
        />
      </div>

      <section className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg-2">Detalhes</h2>
        <form action={updateDetails} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">Nome</label>
            <input
              name="name"
              defaultValue={template.name}
              required
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">
              Assunto padrão
            </label>
            <PlaceholderTextInput
              name="subject"
              defaultValue={template.subject}
              placeholders={placeholderOptions}
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-border-1 px-3 py-1.5 text-sm text-fg-2 hover:bg-bg-surface-2"
          >
            Salvar
          </button>
        </form>
      </section>

      <TemplateEditorClient
        templateId={template.id}
        initialContent={parseEmailDocument(template.content)}
        placeholders={placeholderOptions}
      />
    </div>
  );
}
