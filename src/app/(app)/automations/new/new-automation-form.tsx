"use client";

import { useState, useTransition } from "react";
import { createAutomation } from "../actions";
import { TriggerConfigFields, type TriggerCatalogs } from "../trigger-config-fields";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";

export function NewAutomationForm({ catalogs }: { catalogs: TriggerCatalogs }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createAutomation(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar a automação.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-fg-2">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex: Boas-vindas a novos leads"
          className={inputClass}
        />
      </div>

      <TriggerConfigFields catalogs={catalogs} />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        {isPending ? "Criando..." : "Criar automação"}
      </button>
    </form>
  );
}
