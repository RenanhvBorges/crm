"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDeal } from "@/app/(app)/deals/actions";

export function DealQuickAddForm({
  pipelineId,
  firstStageId,
  contacts,
}: {
  pipelineId: string;
  firstStageId: string;
  contacts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
      >
        Novo negócio
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await createDeal(formData);
          formRef.current?.reset();
          setOpen(false);
          router.refresh();
        });
      }}
      className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-1 bg-oxford-white p-4"
    >
      <input type="hidden" name="pipeline_id" value={pipelineId} />
      <input type="hidden" name="stage_id" value={firstStageId} />

      <div>
        <label className="mb-1 block text-xs font-medium text-fg-2">Título</label>
        <input
          name="title"
          required
          className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-fg-2">Valor (R$)</label>
        <input
          name="value"
          type="number"
          step="0.01"
          className="w-32 rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-fg-2">Contato</label>
        <select
          name="contact_id"
          className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        >
          <option value="">Nenhum</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-fg-2">
          Previsão de fechamento
        </label>
        <input
          name="expected_close_date"
          type="date"
          className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        Criar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md px-4 py-2 text-sm text-fg-3 hover:text-fg-1"
      >
        Cancelar
      </button>
    </form>
  );
}
