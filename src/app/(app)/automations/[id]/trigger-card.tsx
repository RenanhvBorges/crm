"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { describeTrigger } from "@/lib/automations/triggers";
import { updateAutomationSettings } from "../actions";
import { TriggerConfigFields } from "../trigger-config-fields";
import type { BuilderCatalogs } from "./builder-types";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";

export function TriggerCard({
  automation,
  catalogs,
}: {
  automation: {
    id: string;
    name: string;
    trigger_type: string;
    trigger_config: unknown;
    allow_reentry: boolean;
  };
  catalogs: BuilderCatalogs;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const summary = describeTrigger(automation.trigger_type, automation.trigger_config, {
    list: (id) => catalogs.lists.find((l) => l.id === id)?.name,
    stage: (id) => catalogs.stages.find((s) => s.id === id)?.name,
    pipeline: (id) => catalogs.pipelines.find((p) => p.id === id)?.name,
    campaign: (id) => catalogs.campaigns.find((c) => c.id === id)?.name,
  });

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAutomationSettings(automation.id, formData);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar o gatilho.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border-2 border-oxford-blue bg-oxford-white shadow-sm">
      <div className="flex items-center gap-3 p-3">
        <Zap size={18} strokeWidth={1.5} className="shrink-0 text-oxford-blue" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Gatilho</p>
          <p className="truncate text-sm font-medium text-fg-1">{summary}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2"
        >
          {editing ? "Fechar" : "Editar"}
        </button>
      </div>

      {editing ? (
        <form action={handleSubmit} className="space-y-3 border-t border-border-1 p-3">
          <div>
            <label htmlFor="automation-name" className="mb-1 block text-sm font-medium text-fg-2">
              Nome da automação
            </label>
            <input
              id="automation-name"
              name="name"
              defaultValue={automation.name}
              required
              className={inputClass}
            />
          </div>

          <TriggerConfigFields
            catalogs={catalogs}
            initialTriggerType={automation.trigger_type}
            initialConfig={automation.trigger_config}
          />

          <label className="flex items-center gap-2 text-sm text-fg-2">
            <input
              type="checkbox"
              name="allow_reentry"
              defaultChecked={automation.allow_reentry}
              className="rounded border-border-1"
            />
            Permitir que o mesmo contato entre mais de uma vez
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Salvar gatilho"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
