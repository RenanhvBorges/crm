"use client";

import { useRef, useState } from "react";
import { PlaceholderPicker } from "@/components/email-placeholder-picker";
import type { PlaceholderOption } from "@/lib/email-placeholders";

// Input de texto simples (não controlado pelo pai — participa de formulários
// nativos via `name`) com um seletor de placeholders que insere o token na
// posição do cursor.
export function PlaceholderTextInput({
  name,
  defaultValue = "",
  placeholders,
  placeholder,
  required,
}: {
  name: string;
  defaultValue?: string;
  placeholders: PlaceholderOption[];
  placeholder?: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  function insert(token: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
      />
      <PlaceholderPicker options={placeholders} onInsert={insert} />
    </div>
  );
}
