"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { nodeDefinition } from "@/lib/automations/node-catalog";
import type { FlowNodeType } from "@/lib/automations/flow";
import { cancelEnrollment } from "../actions";

const STATUS_LABEL: Record<string, string> = {
  running: "Em execução",
  waiting: "Aguardando",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  running: "bg-oxford-blue-50 text-oxford-blue",
  waiting: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-bg-surface-2 text-fg-3",
};

const STEP_STATUS_LABEL: Record<string, string> = {
  ok: "ok",
  error: "erro",
  skipped: "pulado",
};

export type EnrollmentRow = {
  id: string;
  status: string;
  created_at: string;
  wait_until: string | null;
  error_message: string | null;
  contactName: string;
  steps: {
    id: string;
    node_type: string;
    status: string;
    executed_at: string;
    detail: unknown;
  }[];
};

export function HistoryPanel({ enrollments }: { enrollments: EnrollmentRow[] }) {
  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white">
      <h2 className="border-b border-border-1 px-4 py-3 text-sm font-semibold text-fg-2">
        Histórico de inscrições
      </h2>
      {enrollments.length ? (
        <ul className="divide-y divide-border-1">
          {enrollments.map((e) => (
            <EnrollmentRowItem key={e.id} enrollment={e} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Nenhum contato entrou nesta automação ainda.
        </p>
      )}
    </div>
  );
}

function EnrollmentRowItem({ enrollment }: { enrollment: EnrollmentRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cancellable = enrollment.status === "running" || enrollment.status === "waiting";

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
          <div className="min-w-0">
            <p className="truncate text-sm text-fg-1">{enrollment.contactName}</p>
            <p className="text-xs text-fg-muted">
              Iniciada em {new Date(enrollment.created_at).toLocaleString("pt-BR")}
              {enrollment.wait_until && enrollment.status === "waiting"
                ? ` · retoma em ${new Date(enrollment.wait_until).toLocaleString("pt-BR")}`
                : ""}
            </p>
            {enrollment.error_message ? (
              <p className="text-xs text-danger">{enrollment.error_message}</p>
            ) : null}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[enrollment.status] ?? ""}`}
          >
            {STATUS_LABEL[enrollment.status] ?? enrollment.status}
          </span>
          {cancellable ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!confirm("Cancelar esta inscrição? O contato não avança mais no fluxo.")) return;
                setError(null);
                startTransition(async () => {
                  try {
                    await cancelEnrollment(enrollment.id);
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Não foi possível cancelar.");
                  }
                });
              }}
              className="rounded-md border border-border-1 px-2 py-1 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {open ? (
        enrollment.steps.length ? (
          <ol className="mt-3 space-y-1 border-l border-border-1 pl-3">
            {enrollment.steps.map((s) => {
              const def = nodeDefinition(s.node_type as FlowNodeType);
              const detail = s.detail as Record<string, unknown> | null;
              const reason = detail?.reason ?? detail?.error;
              return (
                <li key={s.id} className="text-xs text-fg-3">
                  <span className="text-fg-2">{def?.label ?? s.node_type}</span>
                  {" — "}
                  {STEP_STATUS_LABEL[s.status] ?? s.status}
                  {reason ? ` (${String(reason)})` : ""}
                  <span className="ml-1 text-fg-muted">
                    {new Date(s.executed_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-fg-muted">Nenhum passo executado ainda.</p>
        )
      ) : null}
    </li>
  );
}
