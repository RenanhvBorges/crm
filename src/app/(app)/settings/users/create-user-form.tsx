"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "./actions";

export function CreateUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await createUser(formData);
        formRef.current?.reset();
        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar o usuário.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-fg-2">
          Nome
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-fg-2">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-fg-2">
          Senha inicial
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
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-fg-2">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="comum"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        >
          <option value="comum">Comum</option>
          <option value="diretor_comercial">Diretor comercial</option>
        </select>
      </div>

      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
        >
          {isPending ? "Criando..." : "Criar usuário"}
        </button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {success ? <p className="text-sm text-success">Usuário criado.</p> : null}
      </div>
    </form>
  );
}
