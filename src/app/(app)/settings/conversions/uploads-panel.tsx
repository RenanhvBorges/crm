"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLATFORM_LABEL, UPLOAD_STATUS_LABEL, type AdPlatform } from "@/lib/ad-conversions/config";
import { retryUpload } from "./actions";

export type UploadRow = {
  id: string;
  platform: string;
  status: string;
  attempts: number;
  value: number | null;
  currency: string | null;
  last_error: string | null;
  created_at: string;
  conversionName: string;
  contact: { id: string; name: string } | null;
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-danger",
};

export function UploadsPanel({ uploads }: { uploads: UploadRow[] }) {
  return (
    <section className="rounded-lg border border-border-1 bg-oxford-white">
      <div className="border-b border-border-1 px-4 py-3">
        <h2 className="text-sm font-semibold text-fg-2">Últimos envios</h2>
        <p className="text-xs text-fg-3">
          Os 50 mais recentes. Envio com erro é tentado de novo até 5 vezes; depois disso, use
          &quot;Reenviar&quot;.
        </p>
      </div>
      {uploads.length ? (
        <ul className="divide-y divide-border-1">
          {uploads.map((u) => (
            <UploadItem key={u.id} upload={u} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">Nenhuma conversão enviada ainda.</p>
      )}
    </section>
  );
}

function UploadItem({ upload }: { upload: UploadRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-fg-1">{upload.conversionName}</span>
          <span className="text-xs text-fg-3">
            {PLATFORM_LABEL[upload.platform as AdPlatform] ?? upload.platform}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[upload.status] ?? ""}`}>
            {UPLOAD_STATUS_LABEL[upload.status] ?? upload.status}
          </span>
        </div>
        <p className="text-xs text-fg-3">
          {new Date(upload.created_at).toLocaleString("pt-BR")} ·{" "}
          {upload.contact ? (
            <Link href={`/contacts/${upload.contact.id}`} className="text-fg-brand hover:underline">
              {upload.contact.name}
            </Link>
          ) : (
            "contato removido"
          )}
          {upload.value !== null && upload.currency
            ? ` · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: upload.currency }).format(upload.value)}`
            : ""}
          {upload.attempts > 1 ? ` · ${upload.attempts} tentativas` : ""}
        </p>
        {upload.last_error ? <p className="mt-1 text-xs text-danger">{upload.last_error}</p> : null}
        {message ? <p className="mt-1 text-xs text-fg-3">{message}</p> : null}
      </div>
      {upload.status === "failed" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await retryUpload(upload.id);
              setMessage(res.message ?? null);
              if (res.ok) router.refresh();
            })
          }
          className="shrink-0 rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50"
        >
          Reenviar
        </button>
      ) : null}
    </li>
  );
}
