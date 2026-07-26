"use client";

import { useMemo, useRef, useState } from "react";
import { X, Plus } from "lucide-react";

export type CatalogTag = { name: string; color: string };

const FALLBACK_COLOR = "#263fa3";

export function TagInput({
  value,
  onChange,
  catalog,
  onCreate,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  catalog: CatalogTag[];
  onCreate?: (name: string) => Promise<CatalogTag>;
}) {
  const [localCatalog, setLocalCatalog] = useState<CatalogTag[]>(catalog);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorOf = (name: string) =>
    localCatalog.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color ??
    FALLBACK_COLOR;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedLower = value.map((v) => v.toLowerCase());
    return localCatalog
      .filter(
        (t) =>
          !selectedLower.includes(t.name.toLowerCase()) &&
          (!q || t.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [localCatalog, query, value]);

  const exactExists = localCatalog.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = Boolean(onCreate) && query.trim().length > 0 && !exactExists;

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setQuery("");
    inputRef.current?.focus();
  }

  function removeTag(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  async function createAndAdd() {
    if (!onCreate) return;
    const name = query.trim();
    if (!name) return;
    setPending(true);
    try {
      const created = await onCreate(name);
      setLocalCatalog((prev) =>
        prev.some((t) => t.name.toLowerCase() === created.name.toLowerCase())
          ? prev
          : [...prev, created],
      );
      addTag(created.name);
    } catch {
      // Em caso de falha, ainda adiciona o nome livremente.
      addTag(name);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length) {
        addTag(suggestions[0].name);
      } else if (canCreate) {
        void createAndAdd();
      } else if (query.trim()) {
        addTag(query);
      }
    } else if (e.key === "Backspace" && !query && value.length) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border-1 px-2 py-1.5 focus-within:border-border-brand">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
            style={{ backgroundColor: colorOf(name) }}
          >
            {name}
            <button
              type="button"
              onClick={() => removeTag(name)}
              className="opacity-80 hover:opacity-100"
              aria-label={`Remover ${name}`}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? "" : "Adicionar tag..."}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      </div>

      {open && (suggestions.length > 0 || canCreate) ? (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border-1 bg-oxford-white shadow-md">
          {suggestions.map((t) => (
            <li key={t.name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(t.name)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-bg-surface-2"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                disabled={pending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={createAndAdd}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg-brand hover:bg-bg-surface-2 disabled:opacity-60"
              >
                <Plus size={14} strokeWidth={1.5} />
                Criar tag &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
