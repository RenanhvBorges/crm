"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Settings2, Trash2, X, Check } from "lucide-react";
import type { Json } from "@/lib/supabase/database.types";
import {
  AGGREGATIONS,
  ENTITIES,
  PERIODS,
  PERIOD_FIELDS,
  formatWidgetValue,
  type FunnelRow,
  type StatWidgetConfig,
  type WidgetAggregation,
  type WidgetEntity,
  type WidgetPeriod,
} from "@/lib/dashboard";
import {
  createWidget,
  deleteWidget,
  reorderWidgets,
  seedDefaultWidgets,
} from "@/app/(app)/dashboard/actions";

export type ComputedWidget = {
  id: string;
  title: string;
  widgetType: "stat" | "funnel";
  config: Json;
  value: number | null;
  funnel: { pipelineName: string; rows: FunnelRow[] } | null;
};

type Pipeline = { id: string; name: string };
type Stage = { id: string; name: string; pipeline_id: string };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function DashboardClient({
  widgets,
  pipelines,
  stages,
  tags,
}: {
  widgets: ComputedWidget[];
  pipelines: Pipeline[];
  stages: Stage[];
  tags: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState(widgets);
  const [syncedFrom, setSyncedFrom] = useState(widgets);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const seeded = useRef(false);

  // Reconcile local order with fresh server data after a refresh.
  if (widgets !== syncedFrom) {
    setSyncedFrom(widgets);
    setOrder(widgets);
  }

  // First visit: no widgets yet → seed a sensible starter dashboard once.
  useEffect(() => {
    if (widgets.length === 0 && !seeded.current) {
      seeded.current = true;
      startTransition(async () => {
        await seedDefaultWidgets();
        router.refresh();
      });
    }
  }, [widgets.length, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((w) => w.id === active.id);
    const newIndex = order.findIndex((w) => w.id === over.id);
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    startTransition(async () => {
      await reorderWidgets(next.map((w) => w.id));
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Dashboard</h1>
        <div className="flex gap-2">
          {editing ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
            >
              <Plus size={16} strokeWidth={1.5} />
              Adicionar métrica
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setAdding(false);
            }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              editing
                ? "bg-oxford-blue text-white hover:bg-oxford-blue-600"
                : "border border-border-1 bg-oxford-white text-fg-2 hover:border-border-brand"
            }`}
          >
            {editing ? (
              <>
                <Check size={16} strokeWidth={1.5} /> Concluir
              </>
            ) : (
              <>
                <Settings2 size={16} strokeWidth={1.5} /> Personalizar
              </>
            )}
          </button>
        </div>
      </div>

      {adding ? (
        <WidgetBuilder
          pipelines={pipelines}
          stages={stages}
          tags={tags}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}

      {order.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-2 bg-oxford-white py-12 text-center text-sm text-fg-muted">
          Montando seu dashboard...
        </p>
      ) : (
        <DndContext
          id="dashboard-grid"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-4">
              {order.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  editing={editing}
                  onDelete={() =>
                    startTransition(async () => {
                      await deleteWidget(widget.id);
                      router.refresh();
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableWidget({
  widget,
  editing,
  onDelete,
}: {
  widget: ComputedWidget;
  editing: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id, disabled: !editing });

  const isFunnel = widget.widgetType === "funnel";
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg border border-border-1 bg-oxford-white p-4 ${
        isFunnel ? "col-span-4" : "col-span-1"
      } ${isDragging ? "z-10 opacity-70 shadow-lg" : ""}`}
    >
      {editing ? (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-fg-muted hover:text-danger"
            aria-label="Remover métrica"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="cursor-grab rounded p-1 text-fg-muted hover:text-fg-2 active:cursor-grabbing"
            aria-label="Reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : null}

      {isFunnel ? (
        <FunnelWidgetView funnel={widget.funnel} title={widget.title} />
      ) : (
        <StatWidgetView widget={widget} />
      )}
    </div>
  );
}

function StatWidgetView({ widget }: { widget: ComputedWidget }) {
  const config = widget.config as unknown as StatWidgetConfig;
  const formatted = formatWidgetValue(config.aggregation, widget.value ?? 0);
  return (
    <>
      <p className="eyebrow">{widget.title}</p>
      <p className="stat mt-1 text-3xl">{formatted}</p>
    </>
  );
}

function FunnelWidgetView({
  funnel,
  title,
}: {
  funnel: ComputedWidget["funnel"];
  title: string;
}) {
  if (!funnel) {
    return <p className="text-sm text-fg-muted">{title}: funil indisponível.</p>;
  }
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border-1 text-left text-xs uppercase tracking-wide text-fg-3">
            <tr>
              <th className="py-2 pr-4 font-medium">Estágio</th>
              <th className="py-2 pr-4 font-medium">Em aberto</th>
              <th className="py-2 pr-4 font-medium">Valor em aberto</th>
              <th className="py-2 font-medium">Já passaram (conversão)</th>
            </tr>
          </thead>
          <tbody>
            {funnel.rows.map((row) => (
              <tr key={row.stageId} className="border-b border-border-1 last:border-0">
                <td className="py-2 pr-4">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </span>
                </td>
                <td className="py-2 pr-4 text-fg-2">{row.openCount}</td>
                <td className="py-2 pr-4 text-fg-2">{currency.format(row.openValue)}</td>
                <td className="py-2 text-fg-2">
                  {row.everEntered} ({row.conversionRate}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WidgetBuilder({
  pipelines,
  stages,
  tags,
  onClose,
  onCreated,
}: {
  pipelines: Pipeline[];
  stages: Stage[];
  tags: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [widgetType, setWidgetType] = useState<"stat" | "funnel">("stat");
  const [title, setTitle] = useState("");
  const [entity, setEntity] = useState<WidgetEntity>("deals");
  const [aggregation, setAggregation] = useState<WidgetAggregation>("count");
  const [period, setPeriod] = useState<WidgetPeriod>("all");
  const [periodField, setPeriodField] = useState("created_at");
  const [dealStatus, setDealStatus] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [tag, setTag] = useState("");
  const [funnelPipelineId, setFunnelPipelineId] = useState(pipelines[0]?.id ?? "");

  const periodFieldOptions = PERIOD_FIELDS[entity];
  const aggregationOptions =
    entity === "deals" ? AGGREGATIONS : AGGREGATIONS.filter((a) => a.value === "count");
  const stagesForPipeline = stages.filter((s) => s.pipeline_id === pipelineId);

  function handleEntityChange(next: WidgetEntity) {
    setEntity(next);
    setAggregation("count");
    setPeriodField(PERIOD_FIELDS[next][0].value);
    setDealStatus("");
    setPipelineId("");
    setStageId("");
    setTaskStatus("");
    setTag("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalTitle = title.trim() || defaultTitle();

    if (widgetType === "funnel") {
      startTransition(async () => {
        await createWidget({
          title: finalTitle,
          widgetType: "funnel",
          config: { pipelineId: funnelPipelineId },
        });
        onCreated();
      });
      return;
    }

    const config: StatWidgetConfig = {
      entity,
      aggregation,
      period,
      periodField,
      filters: {
        ...(entity === "deals" && dealStatus
          ? { dealStatus: dealStatus as "open" | "won" | "lost" }
          : {}),
        ...(entity === "deals" && pipelineId ? { pipelineId } : {}),
        ...(entity === "deals" && stageId ? { stageId } : {}),
        ...(entity === "tasks" && taskStatus
          ? { taskStatus: taskStatus as "pending" | "done" }
          : {}),
        ...(entity === "contacts" && tag ? { tag } : {}),
      },
    };

    startTransition(async () => {
      await createWidget({
        title: finalTitle,
        widgetType: "stat",
        config: config as unknown as Json,
      });
      onCreated();
    });
  }

  function defaultTitle() {
    if (widgetType === "funnel") {
      return pipelines.find((p) => p.id === funnelPipelineId)?.name ?? "Funil";
    }
    const ent = ENTITIES.find((e) => e.value === entity)?.label ?? "";
    const agg = AGGREGATIONS.find((a) => a.value === aggregation)?.label ?? "";
    return `${agg} de ${ent}`.trim();
  }

  const fieldClass =
    "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-fg-2";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-border-brand bg-oxford-white p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-1">Nova métrica</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-muted hover:text-fg-1"
          aria-label="Fechar"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["stat", "funnel"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setWidgetType(t)}
            className={`rounded-full px-3 py-1 text-xs ${
              widgetType === t
                ? "bg-oxford-blue text-white"
                : "bg-bg-surface-2 text-fg-2 hover:bg-oxford-blue-50"
            }`}
          >
            {t === "stat" ? "Número (métrica)" : "Tabela de funil"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label className={labelClass}>Título (opcional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle()}
            className={fieldClass}
          />
        </div>

        {widgetType === "funnel" ? (
          <div className="col-span-3">
            <label className={labelClass}>Funil</label>
            <select
              value={funnelPipelineId}
              onChange={(e) => setFunnelPipelineId(e.target.value)}
              className={fieldClass}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass}>Sobre</label>
              <select
                value={entity}
                onChange={(e) => handleEntityChange(e.target.value as WidgetEntity)}
                className={fieldClass}
              >
                {ENTITIES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Cálculo</label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as WidgetAggregation)}
                className={fieldClass}
              >
                {aggregationOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Período</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as WidgetPeriod)}
                className={fieldClass}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {period !== "all" ? (
              <div>
                <label className={labelClass}>Medido por</label>
                <select
                  value={periodField}
                  onChange={(e) => setPeriodField(e.target.value)}
                  className={fieldClass}
                >
                  {periodFieldOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {entity === "deals" ? (
              <>
                <div>
                  <label className={labelClass}>Situação</label>
                  <select
                    value={dealStatus}
                    onChange={(e) => setDealStatus(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Todas</option>
                    <option value="open">Em aberto</option>
                    <option value="won">Ganhos</option>
                    <option value="lost">Perdidos</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Funil</label>
                  <select
                    value={pipelineId}
                    onChange={(e) => {
                      setPipelineId(e.target.value);
                      setStageId("");
                    }}
                    className={fieldClass}
                  >
                    <option value="">Todos</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {pipelineId ? (
                  <div>
                    <label className={labelClass}>Estágio</label>
                    <select
                      value={stageId}
                      onChange={(e) => setStageId(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Todos</option>
                      {stagesForPipeline.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            ) : null}

            {entity === "tasks" ? (
              <div>
                <label className={labelClass}>Situação</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Todas</option>
                  <option value="pending">Pendentes</option>
                  <option value="done">Concluídas</option>
                </select>
              </div>
            ) : null}

            {entity === "contacts" && tags.length > 0 ? (
              <div>
                <label className={labelClass}>Tag</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Todas</option>
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
        >
          {isPending ? "Adicionando..." : "Adicionar ao dashboard"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm text-fg-3 hover:text-fg-1"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
