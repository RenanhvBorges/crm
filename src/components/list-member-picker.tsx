"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Check } from "lucide-react";

type Candidate = { id: string; name: string; email: string | null };

export function ListMemberPicker({
  listId,
  candidates,
  addAction,
}: {
  listId: string;
  candidates: Candidate[];
  addAction: (listId: string, contactIds: string[]) => Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? candidates.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q),
        )
      : candidates;
    return base.slice(0, 50);
  }, [candidates, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function add() {
    if (!selected.size) return;
    setError(null);
    startTransition(async () => {
      try {
        await addAction(listId, Array.from(selected));
        setSelected(new Set());
        setQuery("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível adicionar.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-fg-2">Adicionar contatos</h2>

      <div className="relative mb-3">
        <Search
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full rounded-md border border-border-1 py-2 pl-9 pr-3 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>

      {candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-muted">
          Todos os contatos já estão nesta lista.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-md border border-border-1">
          {filtered.length ? (
            <ul className="divide-y divide-border-1">
              {filtered.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                        isSelected ? "bg-oxford-blue-50" : "hover:bg-bg-surface-2"
                      }`}
                    >
                      <span>
                        <span className="font-medium text-fg-1">{c.name}</span>
                        {c.email ? (
                          <span className="ml-2 text-xs text-fg-3">{c.email}</span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check size={16} strokeWidth={1.5} className="text-fg-accent" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-fg-muted">
              Nenhum contato encontrado.
            </p>
          )}
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={add}
        disabled={isPending || selected.size === 0}
        className="mt-3 flex items-center gap-2 rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        <Plus size={16} strokeWidth={1.5} />
        {selected.size > 0
          ? `Adicionar ${selected.size} ${selected.size === 1 ? "contato" : "contatos"}`
          : "Adicionar contatos"}
      </button>
    </div>
  );
}
