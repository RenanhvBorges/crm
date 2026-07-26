import { createClient } from "@/lib/supabase/server";
import { FIELD_TYPES } from "@/lib/custom-fields";
import {
  createFieldDefinition,
  deleteFieldDefinition,
  createFieldGroup,
  deleteFieldGroup,
} from "./actions";
import { DeleteFieldButton } from "@/components/delete-field-button";

export default async function ContactFieldsPage() {
  const supabase = await createClient();
  const [{ data: fields }, { data: groups }] = await Promise.all([
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
  ]);

  const allFields = fields ?? [];
  const allGroups = groups ?? [];

  // Agrupa campos: cada grupo + uma seção "Sem grupo" ao final.
  const sections = [
    ...allGroups.map((group) => ({
      id: group.id,
      name: group.name,
      deletable: true,
      fields: allFields.filter((f) => f.group_id === group.id),
    })),
    {
      id: null as string | null,
      name: "Sem grupo",
      deletable: false,
      fields: allFields.filter((f) => !f.group_id),
    },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl">Campos</h1>
      </div>
      <p className="mb-6 text-sm text-fg-3">
        Crie e organize os campos dos contatos em grupos.
      </p>

      <div className="mb-8 space-y-6">
        {sections.map((section) => {
          // Não mostra a seção "Sem grupo" se estiver vazia e existirem grupos.
          if (section.id === null && !section.fields.length && allGroups.length) {
            return null;
          }
          return (
            <div
              key={section.id ?? "__ungrouped"}
              className="rounded-lg border border-border-1 bg-oxford-white"
            >
              <div className="flex items-center justify-between border-b border-border-1 px-4 py-3">
                <h2 className="text-sm font-semibold text-fg-1">{section.name}</h2>
                {section.deletable && section.id ? (
                  <DeleteFieldButton
                    fieldId={section.id}
                    deleteAction={deleteFieldGroup}
                    confirmMessage="Excluir este grupo? Os campos ficarão sem grupo."
                  />
                ) : null}
              </div>
              {section.fields.length ? (
                <ul className="divide-y divide-border-1">
                  {section.fields.map((field) => (
                    <li
                      key={field.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-fg-1">
                          {field.label}
                          {field.is_required ? (
                            <span className="ml-1 text-danger">*</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-fg-3">
                          {FIELD_TYPES.find((t) => t.value === field.field_type)?.label ??
                            field.field_type}{" "}
                          · chave: {field.key}
                        </p>
                      </div>
                      <DeleteFieldButton
                        fieldId={field.id}
                        deleteAction={deleteFieldDefinition}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-center text-sm text-fg-muted">
                  Nenhum campo neste grupo.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <form
          action={createFieldDefinition}
          className="space-y-4 rounded-lg border border-border-1 bg-oxford-white p-4"
        >
          <h3 className="text-sm font-semibold text-fg-2">Novo campo</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">
              Nome do campo
            </label>
            <input
              name="label"
              required
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">Tipo</label>
            <select
              name="field_type"
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">Grupo</label>
            <select
              name="group_id"
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            >
              <option value="">Sem grupo</option>
              {allGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">
              Opções (seleção única/múltipla, separadas por vírgula)
            </label>
            <input
              name="options"
              placeholder="ex: Frio, Morno, Quente"
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-fg-2">
            <input type="checkbox" name="is_required" className="h-4 w-4" />
            Obrigatório
          </label>
          <button
            type="submit"
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
          >
            Adicionar campo
          </button>
        </form>

        <form
          action={createFieldGroup}
          className="h-fit space-y-4 rounded-lg border border-border-1 bg-oxford-white p-4"
        >
          <h3 className="text-sm font-semibold text-fg-2">Novo grupo</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-2">
              Nome do grupo
            </label>
            <input
              name="name"
              required
              placeholder="ex: Dados de faturamento"
              className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
          >
            Criar grupo
          </button>
        </form>
      </div>
    </div>
  );
}
