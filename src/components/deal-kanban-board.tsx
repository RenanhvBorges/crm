"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { moveDealStage } from "@/app/(app)/deals/actions";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { useSelection } from "@/components/bulk/use-selection";
import { useBulkRunner } from "@/components/bulk/bulk-bar";
import { DealsBulkBar } from "@/components/bulk/deals-bulk-bar";

export type KanbanStage = {
  id: string;
  name: string;
  color: string;
};

export type KanbanDeal = {
  id: string;
  title: string;
  value: number;
  stage_id: string;
  contact: { id: string; name: string } | null;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function DealKanbanBoard({
  stages,
  deals: initialDeals,
}: {
  stages: KanbanStage[];
  deals: KanbanDeal[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [syncedFrom, setSyncedFrom] = useState(initialDeals);
  const [activeDeal, setActiveDeal] = useState<KanbanDeal | null>(null);

  // Reconcile local (optimistic) state with fresh server data after a refresh.
  if (initialDeals !== syncedFrom) {
    setSyncedFrom(initialDeals);
    setDeals(initialDeals);
  }
  const [, startTransition] = useTransition();

  const dealIds = useMemo(() => deals.map((d) => d.id), [deals]);
  const selection = useSelection(dealIds);
  const runner = useBulkRunner(selection.clear);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const newStageId = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
    );

    startTransition(async () => {
      try {
        await moveDealStage(dealId, newStageId);
      } catch {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stage_id: deal.stage_id } : d)),
        );
      }
    });
  }

  return (
    <DndContext
      id="deals-kanban"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage_id === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              count={stageDeals.length}
              total={stageTotal}
              columnIds={stageDeals.map((d) => d.id)}
              selection={selection}
            >
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  selected={selection.isSelected(deal.id)}
                  onToggleSelect={() => selection.toggle(deal.id)}
                />
              ))}
            </StageColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
      </DragOverlay>

      <DealsBulkBar
        ids={selection.selectedIds}
        stages={stages}
        hideStatuses={["open"]}
        runner={runner}
        onClear={selection.clear}
      />
    </DndContext>
  );
}

function StageColumn({
  stage,
  count,
  total,
  columnIds,
  selection,
  children,
}: {
  stage: KanbanStage;
  count: number;
  total: number;
  columnIds: string[];
  selection: ReturnType<typeof useSelection>;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const selectedInColumn = columnIds.filter((id) => selection.isSelected(id)).length;
  const allInColumn = columnIds.length > 0 && selectedInColumn === columnIds.length;

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-lg border border-border-1 bg-bg-surface-2 ${
        isOver ? "ring-2 ring-oxford-blue" : ""
      }`}
    >
      <div className="border-b border-border-1 p-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="flex-1 text-sm font-semibold text-fg-1">{stage.name}</h3>
          {columnIds.length ? (
            <SelectCheckbox
              checked={allInColumn}
              indeterminate={selectedInColumn > 0 && !allInColumn}
              onChange={() => selection.setMany(columnIds, !allInColumn)}
              label={`Selecionar todos os negócios de ${stage.name}`}
            />
          ) : null}
        </div>
        <p className="mt-1 text-xs text-fg-3">
          {count} {count === 1 ? "negócio" : "negócios"} · {currency.format(total)}
        </p>
      </div>
      <div className="flex-1 space-y-2 p-2">{children}</div>
    </div>
  );
}

function DealCard({
  deal,
  isOverlay,
  selected = false,
  onToggleSelect,
}: {
  deal: KanbanDeal;
  isOverlay?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Um clique sem arrastar (< 6px, mesmo limiar do drag) abre o detalhe.
  const dragPointerDown = listeners?.onPointerDown;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        dragPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (isOverlay || !start) return;
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (moved < 6) router.push(`/deals/${deal.id}`);
      }}
      className={`cursor-pointer rounded-md border bg-oxford-white p-3 shadow-sm transition-colors hover:border-border-brand active:cursor-grabbing ${
        selected ? "border-border-brand bg-oxford-blue-50" : "border-border-1"
      } ${isDragging && !isOverlay ? "opacity-40" : ""} ${isOverlay ? "rotate-2 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium text-fg-1">{deal.title}</p>
        {onToggleSelect ? (
          // Pointer events não podem chegar ao card: senão o clique inicia um
          // arrasto ou navega para o detalhe do negócio.
          <span
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectCheckbox
              checked={selected}
              onChange={onToggleSelect}
              label={`Selecionar ${deal.title}`}
            />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-fg-accent">{currency.format(deal.value)}</p>
      {deal.contact ? (
        <Link
          href={`/contacts/${deal.contact.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="mt-1 block text-xs text-fg-3 hover:underline"
        >
          {deal.contact.name}
        </Link>
      ) : null}
    </div>
  );
}
