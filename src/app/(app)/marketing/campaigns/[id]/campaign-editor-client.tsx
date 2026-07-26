"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { BlockEditor } from "@/components/email-editor/block-editor";
import { EmailPreview } from "@/components/email-editor/email-preview";
import { renderBlocksToHtml, type EmailDocument } from "@/lib/email-blocks";
import type { PlaceholderOption } from "@/lib/email-placeholders";
import {
  updateCampaignContent,
  sendCampaignNow,
  scheduleCampaign,
  cancelSchedule,
} from "../actions";

type Stats = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  suppressed: number;
};

export function CampaignEditorClient({
  campaignId,
  status,
  scheduledAt,
  errorMessage,
  initialContent,
  placeholders,
  stats,
}: {
  campaignId: string;
  status: string;
  scheduledAt: string | null;
  errorMessage: string | null;
  initialContent: EmailDocument;
  placeholders: PlaceholderOption[];
  stats: Stats;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");

  const locked = status !== "draft";
  const dirty = JSON.stringify(content) !== JSON.stringify(savedContent);

  function runAction(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
      }
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg-2">Conteúdo</h2>
          <div className="flex overflow-hidden rounded-md border border-border-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                mode === "edit" ? "bg-oxford-blue text-white" : "text-fg-3 hover:bg-bg-surface-2"
              }`}
            >
              <Pencil size={13} strokeWidth={1.5} />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                mode === "preview" ? "bg-oxford-blue text-white" : "text-fg-3 hover:bg-bg-surface-2"
              }`}
            >
              <Eye size={13} strokeWidth={1.5} />
              Pré-visualizar
            </button>
          </div>
        </div>

        {mode === "edit" ? (
          locked ? (
            <p className="text-sm text-fg-muted">
              O conteúdo não pode mais ser editado (a campanha já saiu do status de rascunho).
            </p>
          ) : (
            <BlockEditor value={content} onChange={setContent} placeholders={placeholders} />
          )
        ) : (
          <EmailPreview html={renderBlocksToHtml(content)} />
        )}

        {!locked ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={!dirty || isPending}
              onClick={() =>
                runAction(async () => {
                  await updateCampaignContent(campaignId, content);
                  setSavedContent(content);
                })
              }
              className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar conteúdo"}
            </button>
            {dirty ? <span className="text-xs text-fg-muted">Alterações não salvas</span> : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg-2">Envio</h2>

        {status === "draft" ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!confirm("Enviar esta campanha agora? Isso vai disparar e-mails reais.")) {
                  return;
                }
                runAction(() => sendCampaignNow(campaignId));
              }}
              className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-50"
            >
              Enviar agora
            </button>

            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
              />
              <button
                type="button"
                disabled={isPending || !scheduleValue}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("scheduled_at", scheduleValue);
                  runAction(() => scheduleCampaign(campaignId, fd));
                }}
                className="rounded-md border border-border-1 px-3 py-2 text-sm text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
              >
                Agendar
              </button>
            </div>
          </div>
        ) : status === "scheduled" ? (
          <div className="space-y-2">
            <p className="text-sm text-fg-2">
              Agendada para{" "}
              {scheduledAt ? new Date(scheduledAt).toLocaleString("pt-BR") : "—"}.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => runAction(() => cancelSchedule(campaignId))}
              className="rounded-md border border-border-1 px-3 py-2 text-sm text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
            >
              Cancelar agendamento
            </button>
          </div>
        ) : (
          <p className="text-sm text-fg-3">
            {status === "sending"
              ? "Envio em andamento..."
              : status === "sent"
                ? "Campanha enviada."
                : status === "failed"
                  ? "O envio falhou."
                  : "Campanha cancelada."}
          </p>
        )}

        {errorMessage ? (
          <p className="mt-2 text-sm text-danger">
            Último erro no envio: {errorMessage}
            {status === "sending" ? " (tentando de novo automaticamente)" : ""}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>

      {stats.total > 0 ? (
        <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-fg-2">Estatísticas</h2>
          <dl className="grid grid-cols-3 gap-4 text-center sm:grid-cols-5">
            <Stat label="Enviados" value={stats.sent} />
            <Stat label="Aberturas" value={stats.opened} />
            <Stat label="Cliques" value={stats.clicked} />
            <Stat label="Bounces" value={stats.bounced} />
            <Stat label="Suprimidos" value={stats.suppressed} />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className="text-lg font-semibold text-fg-1">{value}</dd>
    </div>
  );
}
