"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { useSelection } from "@/components/bulk/use-selection";
import { useBulkRunner } from "@/components/bulk/bulk-bar";
import { DealsBulkBar, type BulkStageOption } from "@/components/bulk/deals-bulk-bar";
import { DEAL_STATUS_BADGE, DEAL_STATUS_LABEL, type DealStatus } from "@/lib/deals";

export type ClosedDealRow = {
  id: string;
  title: string;
  value: number;
  status: DealStatus;
  closed_at: string | null;
  pipeline_name: string | null;
  stage_name: string | null;
  contact: { id: string; name: string } | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// Fuso fixo: o mesmo texto no servidor (UTC) e no navegador, sem erro de hidratação.
const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

export function ClosedDealsTable({
  deals,
  stages,
  hideStatuses,
  emptyMessage,
}: {
  deals: ClosedDealRow[];
  stages: BulkStageOption[];
  hideStatuses: DealStatus[];
  emptyMessage: string;
}) {
  const ids = useMemo(() => deals.map((d) => d.id), [deals]);
  const selection = useSelection(ids);
  const runner = useBulkRunner(selection.clear);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border-1 bg-oxford-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-1 bg-bg-surface-2 text-left text-xs uppercase tracking-wide text-fg-3">
            <tr>
              <th className="w-10 px-4 py-3">
                <SelectCheckbox
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.toggleAll}
                  label="Selecionar todos os negócios"
                />
              </th>
              <th className="px-4 py-3 font-medium">Negócio</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Funil</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Fechado em</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className={`border-b border-border-1 last:border-0 ${
                  selection.isSelected(deal.id) ? "bg-oxford-blue-50" : ""
                }`}
              >
                <td className="w-10 px-4 py-3 align-top">
                  <SelectCheckbox
                    checked={selection.isSelected(deal.id)}
                    onChange={() => selection.toggle(deal.id)}
                    label={`Selecionar ${deal.title}`}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="font-medium text-fg-brand hover:underline"
                  >
                    {deal.title}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  {deal.contact ? (
                    <Link
                      href={`/contacts/${deal.contact.id}`}
                      className="text-fg-2 hover:underline"
                    >
                      {deal.contact.name}
                    </Link>
                  ) : (
                    <span className="text-fg-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-fg-2">
                  {deal.pipeline_name ?? "—"}
                  {deal.stage_name ? (
                    <span className="block text-xs text-fg-3">{deal.stage_name}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right align-top tabular-nums text-fg-accent">
                  {currency.format(deal.value)}
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${DEAL_STATUS_BADGE[deal.status]}`}
                  >
                    {DEAL_STATUS_LABEL[deal.status]}
                  </span>
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-fg-2">
                  {deal.closed_at ? dateFormat.format(new Date(deal.closed_at)) : "—"}
                </td>
              </tr>
            ))}
            {!deals.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <DealsBulkBar
        ids={selection.selectedIds}
        stages={stages}
        hideStatuses={hideStatuses}
        runner={runner}
        onClear={selection.clear}
      />
    </>
  );
}
