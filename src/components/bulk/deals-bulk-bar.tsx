"use client";

import { useState } from "react";
import { ArrowRightLeft, RotateCcw, ThumbsDown, Trash2, Trophy } from "lucide-react";
import { bulkDeleteDeals, bulkMoveDeals, bulkSetDealStatus } from "@/app/(app)/deals/actions";
import type { DealStatus } from "@/lib/deals";
import {
  BulkBar,
  BulkButton,
  BulkMenu,
  MenuApplyButton,
  menuSelectClass,
  type BulkRunner,
} from "./bulk-bar";

export type BulkStageOption = { id: string; name: string; pipelineName?: string };

export function DealsBulkBar({
  ids,
  stages,
  // Status dos negócios selecionados que não faz sentido oferecer (ex.: "Reabrir" no funil).
  hideStatuses = [],
  runner,
  onClear,
}: {
  ids: string[];
  stages: BulkStageOption[];
  hideStatuses?: DealStatus[];
  runner: BulkRunner;
  onClear: () => void;
}) {
  const { run, isPending } = runner;
  const [stageId, setStageId] = useState("");

  const setStatus = (status: DealStatus) => run(() => bulkSetDealStatus(ids, status));

  return (
    <BulkBar
      count={ids.length}
      singular="selecionado"
      plural="selecionados"
      runner={runner}
      onClear={onClear}
    >
      {stages.length ? (
        <BulkMenu
          label="Mover para estágio"
          icon={<ArrowRightLeft size={14} strokeWidth={1.5} />}
          disabled={isPending}
        >
          {(close) => (
            <div>
              <p className="mb-2 text-xs font-medium text-fg-3">Estágio de destino</p>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className={menuSelectClass}
              >
                <option value="">Selecione...</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.pipelineName ? `${s.pipelineName} · ${s.name}` : s.name}
                  </option>
                ))}
              </select>
              <MenuApplyButton
                label="Mover"
                disabled={isPending || !stageId}
                onClick={() => {
                  close();
                  run(() => bulkMoveDeals(ids, stageId));
                }}
              />
            </div>
          )}
        </BulkMenu>
      ) : null}

      {!hideStatuses.includes("won") ? (
        <BulkButton
          label="Marcar como ganho"
          icon={<Trophy size={14} strokeWidth={1.5} />}
          disabled={isPending}
          onClick={() => setStatus("won")}
        />
      ) : null}
      {!hideStatuses.includes("lost") ? (
        <BulkButton
          label="Marcar como perdido"
          icon={<ThumbsDown size={14} strokeWidth={1.5} />}
          disabled={isPending}
          onClick={() => setStatus("lost")}
        />
      ) : null}
      {!hideStatuses.includes("open") ? (
        <BulkButton
          label="Reabrir"
          icon={<RotateCcw size={14} strokeWidth={1.5} />}
          disabled={isPending}
          onClick={() => setStatus("open")}
        />
      ) : null}

      <BulkButton
        label="Excluir"
        danger
        icon={<Trash2 size={14} strokeWidth={1.5} />}
        disabled={isPending}
        onClick={() =>
          run(() => bulkDeleteDeals(ids), {
            confirm: `Excluir ${ids.length} negócio(s)? Esta ação não pode ser desfeita.`,
          })
        }
      />
    </BulkBar>
  );
}
