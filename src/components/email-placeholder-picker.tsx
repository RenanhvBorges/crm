"use client";

import { useState } from "react";
import { Braces } from "lucide-react";
import type { PlaceholderOption } from "@/lib/email-placeholders";

// Dropdown reutilizável que só devolve o token escolhido via onInsert — cada
// chamador decide como inserir (posição do cursor num input, execCommand num
// contentEditable, etc), já que isso varia por tipo de campo.
export function PlaceholderPicker({
  options,
  onInsert,
}: {
  options: PlaceholderOption[];
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!options.length) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center gap-1 rounded-md border border-border-1 px-2 py-2 text-xs text-fg-2 hover:bg-bg-surface-2"
      >
        <Braces size={14} strokeWidth={1.5} />
        Campo
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 max-h-64 w-60 overflow-y-auto rounded-md border border-border-1 bg-oxford-white p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.token}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onInsert(opt.token);
                  setOpen(false);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-fg-2 hover:bg-bg-surface-2"
              >
                {opt.label}
                <span className="ml-1.5 text-fg-muted">{opt.token}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
