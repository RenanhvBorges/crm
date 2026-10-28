"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  CustomFieldDefinition,
  CustomFieldGroup,
  CustomFieldValues,
} from "@/lib/custom-fields";
import { createContact, updateContact } from "@/app/(app)/contacts/actions";
import { createTagFromPicker } from "@/app/(app)/contacts/tags/actions";
import { TagInput, type CatalogTag } from "@/components/tag-input";
import { CustomFieldInput } from "@/components/custom-field-input";
import { LEAD_SOURCES } from "@/lib/lead-source";

const baseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  // "" = automática: o banco calcula pelos dados de atribuição (detect_lead_source)
  lead_source: z.string().optional(),
});

type BaseFormValues = z.infer<typeof baseSchema>;

export function ContactForm({
  contact,
  fieldDefinitions,
  fieldGroups = [],
  tagCatalog = [],
}: {
  contact?: Tables<"contacts">;
  fieldDefinitions: CustomFieldDefinition[];
  fieldGroups?: CustomFieldGroup[];
  tagCatalog?: CatalogTag[];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const existingCustomFields = (contact?.custom_fields ?? {}) as CustomFieldValues;
  const [customValues, setCustomValues] = useState<CustomFieldValues>(
    existingCustomFields,
  );
  const [tags, setTags] = useState<string[]>(contact?.tags ?? []);

  // Agrupa os campos personalizados: uma seção por grupo + "Sem grupo".
  const groupedFields = [
    ...fieldGroups.map((group) => ({
      id: group.id,
      name: group.name,
      fields: fieldDefinitions.filter((f) => f.group_id === group.id),
    })),
    {
      id: null as string | null,
      name: fieldGroups.length ? "Outros campos" : "Campos personalizados",
      fields: fieldDefinitions.filter((f) => !f.group_id),
    },
  ].filter((section) => section.fields.length > 0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BaseFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      company: contact?.company ?? "",
      lead_source: contact?.lead_source ?? "",
    },
  });

  function setCustomValue(key: string, value: CustomFieldValues[string]) {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(values: BaseFormValues) {
    setSubmitError(null);

    for (const def of fieldDefinitions) {
      if (def.is_required) {
        const value = customValues[def.key];
        if (value === undefined || value === null || value === "") {
          setSubmitError(`O campo "${def.label}" é obrigatório.`);
          return;
        }
      }
    }

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("email", values.email ?? "");
    formData.set("phone", values.phone ?? "");
    formData.set("company", values.company ?? "");
    formData.set("lead_source", values.lead_source ?? "");
    formData.set("tags", tags.join(", "));
    formData.set("custom_fields", JSON.stringify(customValues));

    try {
      if (contact) {
        await updateContact(contact.id, formData);
        router.refresh();
      } else {
        await createContact(formData);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao salvar contato.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome" error={errors.name?.message}>
          <input
            {...register("name")}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="Telefone" error={errors.phone?.message}>
          <input
            {...register("phone")}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="Empresa" error={errors.company?.message}>
          <input
            {...register("company")}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="Origem do lead">
          <select
            {...register("lead_source")}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          >
            <option value="">Automática (pelos dados de atribuição)</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="col-span-2">
          {/* Não pode ser <label>: o label repassa o clique ao primeiro botão
              dentro dele (o "×" da tag recém-adicionada), desfazendo a seleção. */}
          <Field label="Tags" as="div">
            <TagInput
              value={tags}
              onChange={setTags}
              catalog={tagCatalog}
              onCreate={createTagFromPicker}
            />
          </Field>
        </div>
      </div>

      {groupedFields.map((section) => (
        <div key={section.id ?? "__ungrouped"}>
          <h3 className="mb-3 text-sm font-semibold text-fg-2">{section.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            {section.fields.map((def) => (
              <div key={def.id} className={def.field_type === "textarea" ? "col-span-2" : ""}>
                <Field label={def.label + (def.is_required ? " *" : "")}>
                  <CustomFieldInput
                    definition={def}
                    value={customValues[def.key] ?? null}
                    onChange={(value) => setCustomValue(def.key, value)}
                  />
                </Field>
              </div>
            ))}
          </div>
        </div>
      ))}

      {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        {isSubmitting ? "Salvando..." : contact ? "Salvar alterações" : "Criar contato"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  as: Wrapper = "label",
  children,
}: {
  label: string;
  error?: string;
  as?: "label" | "div";
  children: React.ReactNode;
}) {
  return (
    <Wrapper className="block">
      <span className="mb-1 block text-sm font-medium text-fg-2">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </Wrapper>
  );
}
