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
import { PERIODS, type WidgetPeriod } from "@/lib/dashboard";
import {
  BASE_METRICS,
  formatEmailMetricValue,
  type BaseMetric,
  type FormulaConfig,
  type FormulaOperator,
  type StatConfig,
} from "@/lib/email-metrics";
import {
  createMetricWidget,
  deleteMetricWidget,
  reorderMetricWidgets,
  seedDefaultMetricWidgets,
} from "@/app/(app)/marketing/metrics/actions";

export type ComputedMetricWidget = {
  id: string;
  title: string;
  widgetType: "stat" | "formula";
  config: Json;
  value: number | null;
};

type Campaign = { id: string; name: string };

const OPERATORS: { value: FormulaOperator; label: string }[] = [
  { value: "/", label: "÷ dividido por" },
  { value: "+", label: "+ mais" },
  { value: "-", label: "− menos" },
  { value: "*", label: "× vezes" },
];

export function EmailMetricsClient({
  widgets,
  campaigns,
}: {
  widgets: ComputedMetricWidget[];
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState(widgets);
  const [syncedFrom, setSyncedFrom] = useState(widgets);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const seeded = useRef(false);

  if (widgets !== syncedFrom) {
    setSyncedFrom(widgets);
    setOrder(widgets);
  }

  useEffect(() => {
    if (widgets.length === 0 && !seeded.current) {
      seeded.current = true;
      startTransition(async () => {
        await seedDefaultMetricWidgets();
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
      await reorderMetricWidgets(next.map((w) => w.id));
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl">Métricas</h1>
          <p className="text-sm text-fg-3">
            Dashboard de e-mail marketing — cada usuário monta o seu.
          </p>
        </div>
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
          campaigns={campaigns}
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
          id="email-metrics-grid"
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
                      await deleteMetricWidget(widget.id);
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
  widget: ComputedMetricWidget;
  editing: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !editing,
  });

  const config = widget.config as unknown as StatConfig | FormulaConfig;
  const asPercent = "asPercent" in config ? config.asPercent : false;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative col-span-1 rounded-lg border border-border-1 bg-oxford-white p-4 ${
        isDragging ? "z-10 opacity-70 shadow-lg" : ""
      }`}
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

      <p className="eyebrow">{widget.title}</p>
      <p className="stat mt-1 text-3xl">{formatEmailMetricValue(widget.value, asPercent)}</p>
    </div>
  );
}

function WidgetBuilder({
  campaigns,
  onClose,
  onCreated,
}: {
  campaigns: Campaign[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [widgetType, setWidgetType] = useState<"stat" | "formula">("stat");
  const [title, setTitle] = useState("");
  const [statConfig, setStatConfig] = useState<StatConfig>({
    metric: "sent",
    scope: "all",
    period: "all",
  });
  const [metricA, setMetricA] = useState<StatConfig>({
    metric: "opened",
    scope: "all",
    period: "all",
  });
  const [operator, setOperator] = useState<FormulaOperator>("/");
  const [metricB, setMetricB] = useState<StatConfig>({
    metric: "sent",
    scope: "all",
    period: "all",
  });
  const [asPercent, setAsPercent] = useState(true);

  function defaultTitle() {
    if (widgetType === "stat") {
      return BASE_METRICS.find((m) => m.value === statConfig.metric)?.label ?? "Métrica";
    }
    const a = BASE_METRICS.find((m) => m.value === metricA.metric)?.label ?? "";
    const b = BASE_METRICS.find((m) => m.value === metricB.metric)?.label ?? "";
    return `${a} / ${b}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim() || defaultTitle();

    if (widgetType === "stat") {
      startTransition(async () => {
        await createMetricWidget({
          title: finalTitle,
          widgetType: "stat",
          config: statConfig as unknown as Json,
        });
        onCreated();
      });
      return;
    }

    const config: FormulaConfig = { metricA, operator, metricB, asPercent };
    startTransition(async () => {
      await createMetricWidget({
        title: finalTitle,
        widgetType: "formula",
        config: config as unknown as Json,
      });
      onCreated();
    });
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
        {(["stat", "formula"] as const).map((t) => (
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
            {t === "stat" ? "Número simples" : "Fórmula (calculada)"}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className={labelClass}>Título (opcional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={defaultTitle()}
          className={fieldClass}
        />
      </div>

      {widgetType === "stat" ? (
        <MetricConfigFields
          value={statConfig}
          onChange={setStatConfig}
          campaigns={campaigns}
          fieldClass={fieldClass}
          labelClass={labelClass}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className={labelClass}>Métrica A</p>
            <MetricConfigFields
              value={metricA}
              onChange={setMetricA}
              campaigns={campaigns}
              fieldClass={fieldClass}
              labelClass={labelClass}
            />
          </div>
          <div>
            <label className={labelClass}>Operação</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as FormulaOperator)}
              className={fieldClass}
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className={labelClass}>Métrica B</p>
            <MetricConfigFields
              value={metricB}
              onChange={setMetricB}
              campaigns={campaigns}
              fieldClass={fieldClass}
              labelClass={labelClass}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-2">
            <input
              type="checkbox"
              checked={asPercent}
              onChange={(e) => setAsPercent(e.target.checked)}
            />
            Exibir como porcentagem (ex: taxa de abertura)
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-50"
      >
        {isPending ? "Adicionando..." : "Adicionar"}
      </button>
    </form>
  );
}

function MetricConfigFields({
  value,
  onChange,
  campaigns,
  fieldClass,
  labelClass,
}: {
  value: StatConfig;
  onChange: (config: StatConfig) => void;
  campaigns: Campaign[];
  fieldClass: string;
  labelClass: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className={labelClass}>Métrica</label>
        <select
          value={value.metric}
          onChange={(e) => onChange({ ...value, metric: e.target.value as BaseMetric })}
          className={fieldClass}
        >
          {BASE_METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Escopo</label>
        <select
          value={value.scope}
          onChange={(e) =>
            onChange({
              ...value,
              scope: e.target.value as "all" | "campaign",
              campaignId: e.target.value === "all" ? undefined : value.campaignId,
            })
          }
          className={fieldClass}
        >
          <option value="all">Todas as campanhas</option>
          <option value="campaign">Uma campanha</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Período</label>
        <select
          value={value.period}
          onChange={(e) => onChange({ ...value, period: e.target.value as WidgetPeriod })}
          className={fieldClass}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {value.scope === "campaign" ? (
        <div className="col-span-3">
          <label className={labelClass}>Campanha</label>
          <select
            value={value.campaignId ?? ""}
            onChange={(e) => onChange({ ...value, campaignId: e.target.value })}
            className={fieldClass}
          >
            <option value="" disabled>
              Selecione uma campanha
            </option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
