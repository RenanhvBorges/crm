"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { validateFlow, type Flow } from "@/lib/automations/flow";
import { setAutomationStatus, updateAutomationFlow } from "../actions";
import { FlowColumn } from "./flow-editor";
import { TriggerCard } from "./trigger-card";
import type { BuilderCatalogs } from "./builder-types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-bg-surface-2 text-fg-3",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
};

export function AutomationBuilderClient({
  automation,
  initialFlow,
  catalogs,
}: {
  automation: {
    id: string;
    name: string;
    status: string;
    trigger_type: string;
    trigger_config: unknown;
    allow_reentry: boolean;
  };
  initialFlow: Flow;
  catalogs: BuilderCatalogs;
}) {
  const router = useRouter();
  const [flow, setFlow] = useState(initialFlow);
  const [savedFlow, setSavedFlow] = useState(initialFlow);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(flow) !== JSON.stringify(savedFlow);
  const validationErrors = validateFlow(flow);
  const active = automation.status === "active";

  function runAction(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
      }
    });
  }

  function save() {
    runAction(async () => {
      await updateAutomationFlow(automation.id, flow);
      setSavedFlow(flow);
    });
  }

  function activate() {
    runAction(async () => {
      if (dirty) {
        await updateAutomationFlow(automation.id, flow);
        setSavedFlow(flow);
      }
      await setAutomationStatus(automation.id, "active");
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="mb-1 truncate text-2xl">{automation.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[automation.status] ?? ""}`}
            >
              {STATUS_LABEL[automation.status] ?? automation.status}
            </span>
          </div>
          <p className="text-sm text-fg-3">
            Monte o fluxo abaixo do gatilho. Clique num passo para configurá-lo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={!dirty || isPending}
            onClick={save}
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
          {active ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => runAction(() => setAutomationStatus(automation.id, "paused"))}
              className="flex items-center gap-1.5 rounded-md border border-border-1 px-3 py-2 text-sm text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
            >
              <Pause size={14} strokeWidth={1.5} />
              Pausar
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || validationErrors.length > 0}
              onClick={activate}
              className="flex items-center gap-1.5 rounded-md border border-border-1 px-3 py-2 text-sm text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
            >
              <Play size={14} strokeWidth={1.5} />
              Ativar
            </button>
          )}
        </div>
      </div>

      {dirty ? <p className="text-xs text-fg-muted">Alterações não salvas</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {active ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Esta automação está ativa: alterações salvas afetam contatos em andamento, e remover um
          passo em uso fará essas inscrições falharem.
        </p>
      ) : null}

      {validationErrors.length > 0 ? (
        <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {validationErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-lg border border-border-1 bg-bg-surface-2 p-6">
        <TriggerCard automation={automation} catalogs={catalogs} />
        <FlowColumn
          nodes={flow.nodes}
          onChange={(nodes) => setFlow({ nodes })}
          catalogs={catalogs}
          depth={0}
          locked={false}
          isRoot
        />
      </div>
    </section>
  );
}
