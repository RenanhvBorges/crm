"use client";

import { useState } from "react";
import { CheckCheck, RotateCcw, Trash2, UserRound } from "lucide-react";
import { bulkDeleteTasks, bulkReassignTasks, bulkSetTasksDone } from "@/app/(app)/tasks/actions";
import {
  BulkBar,
  BulkButton,
  BulkMenu,
  MenuApplyButton,
  menuSelectClass,
  type BulkRunner,
} from "./bulk-bar";

type ProfileOption = { id: string; full_name: string | null; email: string };

// Valor do <select> para "Sem responsável" (string vazia = nada escolhido ainda).
const UNASSIGNED = "__none__";

export function TasksBulkBar({
  ids,
  profiles,
  runner,
  onClear,
}: {
  ids: string[];
  profiles: ProfileOption[];
  runner: BulkRunner;
  onClear: () => void;
}) {
  const { run, isPending } = runner;
  const [assignee, setAssignee] = useState("");

  return (
    <BulkBar
      count={ids.length}
      singular="selecionada"
      plural="selecionadas"
      runner={runner}
      onClear={onClear}
    >
      <BulkButton
        label="Concluir"
        icon={<CheckCheck size={14} strokeWidth={1.5} />}
        disabled={isPending}
        onClick={() => run(() => bulkSetTasksDone(ids, true))}
      />
      <BulkButton
        label="Reabrir"
        icon={<RotateCcw size={14} strokeWidth={1.5} />}
        disabled={isPending}
        onClick={() => run(() => bulkSetTasksDone(ids, false))}
      />

      <BulkMenu
        label="Reatribuir"
        icon={<UserRound size={14} strokeWidth={1.5} />}
        disabled={isPending}
      >
        {(close) => (
          <div>
            <p className="mb-2 text-xs font-medium text-fg-3">Novo responsável</p>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className={menuSelectClass}
            >
              <option value="">Selecione...</option>
              <option value={UNASSIGNED}>Sem responsável</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email}
                </option>
              ))}
            </select>
            <MenuApplyButton
              label="Reatribuir"
              disabled={isPending || !assignee}
              onClick={() => {
                close();
                run(() => bulkReassignTasks(ids, assignee === UNASSIGNED ? null : assignee));
              }}
            />
          </div>
        )}
      </BulkMenu>

      <BulkButton
        label="Excluir"
        danger
        icon={<Trash2 size={14} strokeWidth={1.5} />}
        disabled={isPending}
        onClick={() =>
          run(() => bulkDeleteTasks(ids), {
            confirm: `Excluir ${ids.length} tarefa(s)? Esta ação não pode ser desfeita.`,
          })
        }
      />
    </BulkBar>
  );
}
