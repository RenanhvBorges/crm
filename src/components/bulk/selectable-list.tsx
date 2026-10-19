"use client";

import { useMemo } from "react";
import type { BulkResult } from "@/lib/bulk";
import { SelectCheckbox } from "./select-checkbox";
import { useSelection } from "./use-selection";
import { BulkBar, BulkButton, useBulkRunner } from "./bulk-bar";

export type SelectableListAction = {
  key: string;
  label: string;
  run: (ids: string[]) => Promise<BulkResult>;
  // Aceita {count}, substituído pela quantidade selecionada.
  confirm?: string;
  danger?: boolean;
};

// Lista de linhas já renderizadas no servidor (`content`) com seleção múltipla
// e ações em massa. Cada ação é uma server action que recebe os ids marcados.
export function SelectableList({
  rows,
  actions,
  singular,
  plural,
  emptyMessage,
}: {
  rows: { id: string; content: React.ReactNode }[];
  actions: SelectableListAction[];
  singular: string;
  plural: string;
  emptyMessage: string;
}) {
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const selection = useSelection(ids);
  const runner = useBulkRunner(selection.clear);

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border-1 bg-oxford-white">
        <p className="px-4 py-6 text-center text-sm text-fg-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border-1 bg-oxford-white">
        <div className="flex items-center gap-3 border-b border-border-1 px-4 py-2 text-xs text-fg-3">
          <SelectCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={selection.toggleAll}
            label="Selecionar todos"
          />
          {selection.count
            ? `${selection.count} de ${rows.length} selecionados`
            : "Selecionar todos"}
        </div>
        <ul className="divide-y divide-border-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex items-center gap-3 pl-4 ${
                selection.isSelected(row.id) ? "bg-oxford-blue-50" : ""
              }`}
            >
              <SelectCheckbox
                checked={selection.isSelected(row.id)}
                onChange={() => selection.toggle(row.id)}
                label="Selecionar"
              />
              <div className="min-w-0 flex-1">{row.content}</div>
            </li>
          ))}
        </ul>
      </div>

      <BulkBar
        count={selection.count}
        singular={singular}
        plural={plural}
        runner={runner}
        onClear={selection.clear}
      >
        {actions.map((action) => (
          <BulkButton
            key={action.key}
            label={action.label}
            danger={action.danger}
            disabled={runner.isPending}
            onClick={() =>
              runner.run(() => action.run(selection.selectedIds), {
                confirm: action.confirm?.replaceAll("{count}", String(selection.count)),
              })
            }
          />
        ))}
      </BulkBar>
    </>
  );
}
