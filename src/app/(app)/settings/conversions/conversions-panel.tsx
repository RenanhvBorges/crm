"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import type { BulkResult } from "@/lib/bulk";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { META_EVENT_SUGGESTIONS, VALUE_MODES } from "@/lib/ad-conversions/config";
import { createConversion, deleteConversion, setConversionActive, updateConversion } from "./actions";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-fg-2";
const hintClass = "mt-1 text-xs text-fg-muted";
const buttonClass =
  "rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50";

type Conversion = Tables<"ad_conversions">;

const brl = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

function valueLabel(c: Conversion): string {
  if (c.value_mode === "fixed") return brl(Number(c.fixed_value), c.currency);
  if (c.value_mode === "deal") return "valor do negócio";
  return "sem valor";
}

export function ConversionsPanel({ conversions }: { conversions: Conversion[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-lg border border-border-1 bg-oxford-white">
      <div className="flex items-center justify-between border-b border-border-1 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-fg-2">Conversões</h2>
          <p className="text-xs text-fg-3">
            Cada marco do funil, ligado à ação do Google Ads e/ou ao evento da Meta.
          </p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className={buttonClass}>
          {adding ? "Cancelar" : "Nova conversão"}
        </button>
      </div>

      {adding ? (
        <div className="border-b border-border-1 p-4">
          <ConversionForm
            submitAction={createConversion}
            submitLabel="Criar conversão"
            onDone={() => setAdding(false)}
          />
        </div>
      ) : null}

      {conversions.length ? (
        <ul className="divide-y divide-border-1">
          {conversions.map((c) => (
            <ConversionItem key={c.id} conversion={c} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Nenhuma conversão cadastrada. Comece por &quot;Lead qualificado&quot; e &quot;Cliente
          fechado&quot;.
        </p>
      )}
    </section>
  );
}

function ConversionItem({ conversion }: { conversion: Conversion }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-fg-1">{conversion.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                conversion.is_active ? "bg-emerald-50 text-emerald-700" : "bg-bg-surface-2 text-fg-3"
              }`}
            >
              {conversion.is_active ? "Ativa" : "Inativa"}
            </span>
          </div>
          <p className="text-xs text-fg-3">
            {conversion.google_conversion_action_id
              ? `Google Ads: ação ${conversion.google_conversion_action_id}`
              : "Sem Google Ads"}
            {" · "}
            {conversion.meta_event_name ? `Meta: ${conversion.meta_event_name}` : "Sem Meta"}
            {" · "}
            {valueLabel(conversion)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await setConversionActive(conversion.id, !conversion.is_active);
                if (!res.ok) setError(res.message);
                else router.refresh();
              });
            }}
            className={buttonClass}
          >
            {conversion.is_active ? "Desativar" : "Ativar"}
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} className={buttonClass}>
            {editing ? "Fechar" : "Editar"}
          </button>
          <DeleteFieldButton
            fieldId={conversion.id}
            deleteAction={deleteConversion}
            confirmMessage="Excluir esta conversão? O histórico de envios dela também será apagado, e os passos de automação que a usam passam a falhar."
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {editing ? (
        <div className="mt-3 border-t border-border-1 pt-3">
          <ConversionForm
            conversion={conversion}
            submitAction={updateConversion.bind(null, conversion.id)}
            submitLabel="Salvar alterações"
            onDone={() => setEditing(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

function ConversionForm({
  conversion,
  submitAction,
  submitLabel,
  onDone,
}: {
  conversion?: Conversion;
  submitAction: (formData: FormData) => Promise<BulkResult>;
  submitLabel: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [valueMode, setValueMode] = useState(conversion?.value_mode ?? "none");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const res = await submitAction(formData);
          if (!res.ok) {
            setError(res.message);
            return;
          }
          onDone();
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <div>
        <label className={labelClass} htmlFor={`conv-name-${conversion?.id ?? "new"}`}>
          Nome
        </label>
        <input
          id={`conv-name-${conversion?.id ?? "new"}`}
          name="name"
          defaultValue={conversion?.name}
          required
          placeholder="Ex.: Lead qualificado"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`conv-google-${conversion?.id ?? "new"}`}>
            ID da ação de conversão (Google Ads)
          </label>
          <input
            id={`conv-google-${conversion?.id ?? "new"}`}
            name="google_conversion_action_id"
            defaultValue={conversion?.google_conversion_action_id ?? ""}
            placeholder="Ex.: 987654321"
            inputMode="numeric"
            className={inputClass}
          />
          <p className={hintClass}>
            Ação do tipo importação de cliques. O ID costuma aparecer na URL da ação no Google Ads (ctId=...).
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor={`conv-meta-${conversion?.id ?? "new"}`}>
            Evento da Meta
          </label>
          <input
            id={`conv-meta-${conversion?.id ?? "new"}`}
            name="meta_event_name"
            defaultValue={conversion?.meta_event_name ?? ""}
            placeholder="Ex.: LeadQualificado"
            list="meta-event-suggestions"
            className={inputClass}
          />
          <datalist id="meta-event-suggestions">
            {META_EVENT_SUGGESTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p className={hintClass}>
            Evento padrão ou personalizado. Para não duplicar com o pixel, não use &quot;Lead&quot; se a
            LP já envia esse evento.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass} htmlFor={`conv-value-mode-${conversion?.id ?? "new"}`}>
            Valor
          </label>
          <select
            id={`conv-value-mode-${conversion?.id ?? "new"}`}
            name="value_mode"
            value={valueMode}
            onChange={(e) => setValueMode(e.target.value)}
            className={inputClass}
          >
            {VALUE_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {valueMode === "fixed" ? (
          <div>
            <label className={labelClass} htmlFor={`conv-fixed-${conversion?.id ?? "new"}`}>
              Valor fixo
            </label>
            <input
              id={`conv-fixed-${conversion?.id ?? "new"}`}
              name="fixed_value"
              type="number"
              min={0}
              step="0.01"
              defaultValue={conversion?.fixed_value ?? 0}
              className={inputClass}
            />
          </div>
        ) : (
          <div />
        )}
        <div>
          <label className={labelClass} htmlFor={`conv-currency-${conversion?.id ?? "new"}`}>
            Moeda
          </label>
          <input
            id={`conv-currency-${conversion?.id ?? "new"}`}
            name="currency"
            defaultValue={conversion?.currency ?? "BRL"}
            maxLength={3}
            className={inputClass}
          />
        </div>
      </div>
      <p className={hintClass}>
        Cada conversão conta uma vez por contato. Com o valor do negócio, conta uma vez por negócio
        (cada venda).
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
