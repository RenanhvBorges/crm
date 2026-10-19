"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, X } from "lucide-react";
import type { BulkResult } from "@/lib/bulk";

type RunOptions = { confirm?: string };

// Executa uma ação em massa: confirma (opcional), mostra pendência, exibe o
// resultado/erro, limpa a seleção e atualiza a rota.
export function useBulkRunner(onDone: () => void) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const run = useCallback(
    (action: () => Promise<BulkResult>, options?: RunOptions) => {
      if (options?.confirm && !window.confirm(options.confirm)) return;
      setError(null);
      setNotice(null);
      startTransition(async () => {
        try {
          const result = await action();
          if (!result.ok) {
            // Pode ter havido sucesso parcial: atualiza a tela, mas mantém a seleção.
            setError(result.message);
            router.refresh();
            return;
          }
          if (result.message) setNotice(result.message);
          onDone();
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
        }
      });
    },
    [onDone, router],
  );

  return { run, isPending, error, notice, dismiss };
}

export type BulkRunner = ReturnType<typeof useBulkRunner>;

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white transition-colors disabled:opacity-50";

export function BulkButton({
  label,
  icon,
  danger = false,
  disabled,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${buttonClass} ${
        danger ? "bg-danger/90 hover:bg-danger" : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Botão que abre um painel (acima da barra) para escolher parâmetros da ação,
// como tags ou a lista de destino. O painel recebe `close` para se fechar após aplicar.
export function BulkMenu({
  label,
  icon,
  disabled,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${buttonClass} bg-white/10 hover:bg-white/20`}
      >
        {icon}
        {label}
        <ChevronUp
          size={14}
          strokeWidth={1.5}
          className={`transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            className="absolute bottom-full left-0 z-40 mb-2 w-72 rounded-lg border border-border-1 bg-oxford-white p-3 text-fg-1 shadow-lg"
          >
            {children(close)}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Botão primário usado dentro de um BulkMenu (fundo claro).
export function MenuApplyButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-3 w-full rounded-md bg-oxford-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export const menuSelectClass =
  "w-full rounded-md border border-border-1 bg-oxford-white px-2 py-1.5 text-sm focus:border-border-brand focus:outline-none";

export function BulkBar({
  count,
  singular,
  plural,
  runner,
  onClear,
  children,
}: {
  count: number;
  singular: string;
  plural: string;
  runner: BulkRunner;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const { error, notice, dismiss, isPending } = runner;

  if (count === 0) {
    // Seleção já limpa, mas ainda há resultado/erro da última ação para mostrar.
    if (!notice && !error) return null;
    return (
      <div className="sticky bottom-4 z-20 mt-4 flex justify-center">
        <div
          role={error ? "alert" : "status"}
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-lg ${
            error ? "bg-danger-bg text-danger" : "bg-oxford-blue text-white"
          }`}
        >
          {error ?? notice}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar"
            className="opacity-70 hover:opacity-100"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-4 z-20 mt-4 flex justify-center">
      <div className="flex max-w-full flex-col gap-2 rounded-lg bg-oxford-blue px-4 py-2.5 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium">
            {count} {count === 1 ? singular : plural}
          </span>
          {children}
          <button
            type="button"
            onClick={onClear}
            disabled={isPending}
            className="ml-1 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white disabled:opacity-50"
          >
            <X size={14} strokeWidth={1.5} />
            Limpar
          </button>
        </div>
        {isPending ? <p className="text-xs text-white/70">Aplicando...</p> : null}
        {error ? (
          <p role="alert" className="rounded bg-danger-bg px-2 py-1 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {notice ? <p className="text-xs text-white/80">{notice}</p> : null}
      </div>
    </div>
  );
}
