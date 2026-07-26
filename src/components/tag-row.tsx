"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { DeleteFieldButton } from "@/components/delete-field-button";

export function TagRow({
  tag,
  usageCount,
  updateAction,
  deleteAction,
}: {
  tag: { id: string; name: string; color: string };
  usageCount: number;
  updateAction: (id: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("color", color);
    startTransition(async () => {
      try {
        await updateAction(tag.id, formData);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  function cancel() {
    setName(tag.name);
    setColor(tag.color);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-9 shrink-0 rounded-md border border-border-1"
            aria-label="Cor da tag"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-border-1 px-3 py-1.5 text-sm focus:border-border-brand focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="text-fg-muted hover:text-fg-accent disabled:opacity-60"
            aria-label="Salvar"
          >
            <Check size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="text-fg-muted hover:text-danger disabled:opacity-60"
            aria-label="Cancelar"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between px-4 py-3">
      <span className="flex items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
        <span className="text-sm font-medium text-fg-1">{tag.name}</span>
        <span className="text-xs text-fg-3">
          · {usageCount} {usageCount === 1 ? "contato" : "contatos"}
        </span>
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-fg-muted hover:text-fg-accent"
          aria-label="Editar"
        >
          <Pencil size={16} strokeWidth={1.5} />
        </button>
        <DeleteFieldButton
          fieldId={tag.id}
          deleteAction={deleteAction}
          confirmMessage="Excluir esta tag? Ela será removida de todos os contatos."
        />
      </div>
    </li>
  );
}
