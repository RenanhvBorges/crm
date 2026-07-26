"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserActive } from "./actions";

export function ToggleActiveButton({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <span className={`text-xs ${active ? "text-success" : "text-fg-3"}`}>
        {active ? "Ativo" : "Desativado"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const confirmMessage = active
            ? "Desativar este usuário? Ele não vai conseguir mais entrar no CRM."
            : "Reativar este usuário?";
          if (!confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            try {
              await setUserActive(userId, !active);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
            }
          });
        }}
        className={`rounded-full px-3 py-1 text-xs transition-colors disabled:opacity-60 ${
          active
            ? "bg-success-bg text-success hover:opacity-80"
            : "bg-bg-surface-2 text-fg-3 hover:opacity-80"
        }`}
      >
        {active ? "Ativo" : "Desativado"}
      </button>
    </div>
  );
}
