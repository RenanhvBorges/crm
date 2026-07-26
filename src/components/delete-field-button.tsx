"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteFieldButton({
  fieldId,
  deleteAction,
  confirmMessage = "Excluir este item?",
}: {
  fieldId: string;
  deleteAction: (id: string) => Promise<void>;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteAction(fieldId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Não foi possível excluir.");
            }
          });
        }}
        className="text-fg-muted hover:text-danger disabled:opacity-60"
        aria-label="Excluir"
      >
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
