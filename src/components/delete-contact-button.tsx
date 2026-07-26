"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteContact } from "@/app/(app)/contacts/actions";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Excluir este contato? Essa ação não pode ser desfeita.")) {
          startTransition(() => deleteContact(contactId));
        }
      }}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-60"
    >
      <Trash2 size={16} strokeWidth={1.5} />
      Excluir
    </button>
  );
}
