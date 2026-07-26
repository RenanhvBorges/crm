"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signIn({ error: null }, formData);

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-oxford-blue px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/brand/logo-oxford-horizontal-white.png"
            alt="Oxford"
            width={160}
            height={36}
            priority
          />
        </div>

        <div className="rounded-lg bg-oxford-white p-8 shadow-lg">
          <h1 className="mb-1 text-2xl">Entrar</h1>
          <p className="mb-6 text-sm text-fg-3">CRM interno da Oxford</p>

          <form action={handleSubmit} className="space-y-4">
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
                Senha
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

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
            >
              {isPending ? "Aguarde..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
