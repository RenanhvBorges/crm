"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDeal } from "@/app/(app)/deals/actions";

export function DeleteDealButton({ dealId }: { dealId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Excluir este negócio? Essa ação não pode ser desfeita.")) {
          startTransition(() => deleteDeal(dealId));
        }
      }}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-60"
    >
      <Trash2 size={16} strokeWidth={1.5} />
      Excluir
    </button>
  );
}
