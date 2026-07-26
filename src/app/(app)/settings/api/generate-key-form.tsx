"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { createApiKey } from "./actions";

export function GenerateKeyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const name = String(formData.get("name") ?? "");
        const token = await createApiKey(name);
        setNewToken(token);
        setCopied(false);
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível gerar a chave.");
      }
    });
  }

  if (newToken) {
    return (
      <div className="rounded-md border border-border-brand bg-oxford-blue-50 p-4">
        <p className="mb-2 text-sm font-medium text-fg-1">
          Copie sua chave agora — ela não será mostrada de novo.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-oxford-white px-3 py-2 text-xs">
            {newToken}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(newToken);
              setCopied(true);
            }}
            className="flex items-center gap-1 rounded-md bg-oxford-blue px-3 py-2 text-xs font-medium text-white hover:bg-oxford-blue-600"
          >
            {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setNewToken(null)}
          className="mt-3 text-xs text-fg-3 underline-offset-4 hover:underline"
        >
          Gerar outra chave
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-fg-2">
          Nome da chave
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Ex: Integração com Zapier"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        {isPending ? "Gerando..." : "Gerar nova chave"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
