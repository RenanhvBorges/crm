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
import { updateDeal } from "@/app/(app)/deals/actions";
import { CustomFieldInput } from "@/components/custom-field-input";

export type DealFormPipeline = {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
};

const baseSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.string().optional(),
  expected_close_date: z.string().optional(),
});

type BaseFormValues = z.infer<typeof baseSchema>;

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

export function DealForm({
  deal,
  pipelines,
  contacts,
  fieldDefinitions,
  fieldGroups = [],
}: {
  deal: Tables<"deals">;
  pipelines: DealFormPipeline[];
  contacts: { id: string; name: string }[];
  fieldDefinitions: CustomFieldDefinition[];
  fieldGroups?: CustomFieldGroup[];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const existingCustomFields = (deal.custom_fields ?? {}) as CustomFieldValues;
  const [customValues, setCustomValues] = useState<CustomFieldValues>(
    existingCustomFields,
  );

  const [pipelineId, setPipelineId] = useState(deal.pipeline_id);
  const [stageId, setStageId] = useState(deal.stage_id);
  const [contactId, setContactId] = useState(deal.contact_id ?? "");
  const [status, setStatus] = useState(deal.status);

  const currentStages =
    pipelines.find((p) => p.id === pipelineId)?.stages ?? [];

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
      title: deal.title,
      value: deal.value ? String(deal.value) : "",
      expected_close_date: deal.expected_close_date ?? "",
    },
  });

  function setCustomValue(key: string, value: CustomFieldValues[string]) {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
  }

  function handlePipelineChange(newPipelineId: string) {
    setPipelineId(newPipelineId);
    // Estágio pode não existir no novo funil — cai no primeiro estágio dele.
    const firstStage = pipelines.find((p) => p.id === newPipelineId)?.stages[0];
    setStageId(firstStage?.id ?? "");
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

    if (!stageId) {
      setSubmitError("Selecione um estágio para o negócio.");
      return;
    }

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("value", values.value ?? "");
    formData.set("expected_close_date", values.expected_close_date ?? "");
    formData.set("contact_id", contactId);
    formData.set("pipeline_id", pipelineId);
    formData.set("stage_id", stageId);
    formData.set("status", status);
    formData.set("custom_fields", JSON.stringify(customValues));

    try {
      await updateDeal(deal.id, formData);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao salvar negócio.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Título" error={errors.title?.message}>
          <input
            {...register("title")}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="Valor (R$)">
          <input
            {...register("value")}
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="Contato">
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          >
            <option value="">Nenhum</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Previsão de fechamento">
          <input
            {...register("expected_close_date")}
            type="date"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </Field>
        <Field label="Funil">
          <select
            value={pipelineId}
            onChange={(e) => handlePipelineChange(e.target.value)}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estágio">
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          >
            {currentStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
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
        {isSubmitting ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-fg-2">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}
