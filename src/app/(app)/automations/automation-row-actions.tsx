"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pause, Play } from "lucide-react";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { deleteAutomation, duplicateAutomation, setAutomationStatus } from "./actions";

export function AutomationRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
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

  const active = status === "active";

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => setAutomationStatus(id, active ? "paused" : "active"))}
        className="flex items-center gap-1.5 rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
      >
        {active ? <Pause size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
        {active ? "Pausar" : "Ativar"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => duplicateAutomation(id))}
        className="text-fg-muted hover:text-fg-1 disabled:opacity-50"
        aria-label="Duplicar"
      >
        <Copy size={16} strokeWidth={1.5} />
      </button>
      <DeleteFieldButton
        fieldId={id}
        deleteAction={deleteAutomation}
        confirmMessage="Excluir esta automação? Inscrições em andamento serão perdidas."
      />
    </div>
  );
}
