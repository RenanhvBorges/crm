"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { EVENT_TYPES } from "@/lib/automations/triggers";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { createWebhook, deleteWebhook, setWebhookActive, updateWebhook } from "./actions";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-fg-2";

export type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  deliveries: { success: number; pending: number; failed: number };
};

export function WebhooksClient({ webhooks }: { webhooks: WebhookRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border-1 bg-oxford-white">
        <div className="flex items-center justify-between border-b border-border-1 px-4 py-3">
          <h2 className="text-sm font-semibold text-fg-2">Webhooks configurados</h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2"
          >
            {adding ? "Cancelar" : "Novo webhook"}
          </button>
        </div>

        {adding ? (
          <div className="border-b border-border-1 p-4">
            <WebhookForm
              onDone={() => setAdding(false)}
              submitAction={createWebhook}
              submitLabel="Criar webhook"
            />
          </div>
        ) : null}

        {webhooks.length ? (
          <ul className="divide-y divide-border-1">
            {webhooks.map((w) => (
              <WebhookItem key={w.id} webhook={w} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            Nenhum webhook configurado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function WebhookItem({ webhook }: { webhook: WebhookRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const eventLabel = webhook.events.includes("*")
    ? "Todos os eventos"
    : `${webhook.events.length} evento${webhook.events.length === 1 ? "" : "s"}`;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-fg-1">{webhook.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                webhook.is_active ? "bg-emerald-50 text-emerald-700" : "bg-bg-surface-2 text-fg-3"
              }`}
            >
              {webhook.is_active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="truncate text-xs text-fg-3">{webhook.url}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {eventLabel} · {webhook.deliveries.success} entregues ·{" "}
            {webhook.deliveries.pending} pendentes · {webhook.deliveries.failed} falharam
          </p>

          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">
              {showSecret ? webhook.secret : "whsec_••••••••••••"}
            </code>
            <button
              type="button"
              aria-label={showSecret ? "Ocultar segredo" : "Mostrar segredo"}
              onClick={() => setShowSecret((v) => !v)}
              className="text-fg-muted hover:text-fg-1"
            >
              {showSecret ? (
                <EyeOff size={14} strokeWidth={1.5} />
              ) : (
                <Eye size={14} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              aria-label="Copiar segredo"
              onClick={() => {
                navigator.clipboard.writeText(webhook.secret);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-fg-muted hover:text-fg-1"
            >
              {copied ? (
                <Check size={14} strokeWidth={1.5} className="text-emerald-600" />
              ) : (
                <Copy size={14} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await setWebhookActive(webhook.id, !webhook.is_active);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Não foi possível alterar.");
                }
              });
            }}
            className="rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
          >
            {webhook.is_active ? "Desativar" : "Ativar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2"
          >
            {editing ? "Fechar" : "Editar"}
          </button>
          <DeleteFieldButton
            fieldId={webhook.id}
            deleteAction={deleteWebhook}
            confirmMessage="Excluir este webhook? O histórico de entregas também será apagado."
          />
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {editing ? (
        <div className="mt-3 border-t border-border-1 pt-3">
          <WebhookForm
            webhook={webhook}
            onDone={() => setEditing(false)}
            submitAction={updateWebhook.bind(null, webhook.id)}
            submitLabel="Salvar alterações"
          />
        </div>
      ) : null}
    </li>
  );
}

function WebhookForm({
  webhook,
  onDone,
  submitAction,
  submitLabel,
}: {
  webhook?: WebhookRow;
  onDone: () => void;
  submitAction: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState(webhook?.events.includes("*") ?? true);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await submitAction(formData);
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar o webhook.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>Nome</label>
        <input
          name="name"
          defaultValue={webhook?.name}
          required
          placeholder="Ex: n8n — fluxo de leads"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>URL de destino</label>
        <input
          name="url"
          type="url"
          defaultValue={webhook?.url}
          required
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>Eventos assinados</legend>
        <label className="flex items-center gap-2 text-sm text-fg-2">
          <input
            type="checkbox"
            name="events"
            value="*"
            checked={allEvents}
            onChange={(e) => setAllEvents(e.target.checked)}
            className="rounded border-border-1"
          />
          Todos os eventos (inclusive os que forem adicionados no futuro)
        </label>

        {!allEvents ? (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {EVENT_TYPES.map((e) => (
              <label key={e.value} className="flex items-center gap-2 text-xs text-fg-2">
                <input
                  type="checkbox"
                  name="events"
                  value={e.value}
                  defaultChecked={webhook?.events.includes(e.value)}
                  className="rounded border-border-1"
                />
                {e.label}
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
