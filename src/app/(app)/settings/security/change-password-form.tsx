"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "./actions";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updatePassword({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-fg-2">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-fg-2">
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {success ? (
        <p className="text-sm text-success">Senha atualizada com sucesso.</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
