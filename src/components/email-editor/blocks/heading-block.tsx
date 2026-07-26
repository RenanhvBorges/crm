"use client";

import { useRef } from "react";
import type { EmailBlock } from "@/lib/email-blocks";
import { PlaceholderPicker } from "@/components/email-placeholder-picker";
import { AlignButtons } from "@/components/email-editor/align-buttons";
import type { PlaceholderOption } from "@/lib/email-placeholders";

type HeadingBlock = Extract<EmailBlock, { type: "heading" }>;

export function HeadingBlockEditor({
  block,
  onChange,
  placeholders,
}: {
  block: HeadingBlock;
  onChange: (block: HeadingBlock) => void;
  placeholders: PlaceholderOption[];
}) {
  const ref = useRef<HTMLInputElement>(null);

  function insert(token: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? block.text.length;
    const end = el?.selectionEnd ?? block.text.length;
    const next = block.text.slice(0, start) + token + block.text.slice(end);
    onChange({ ...block, text: next });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Título"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm font-semibold focus:border-border-brand focus:outline-none"
        />
        <PlaceholderPicker options={placeholders} onInsert={insert} />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={block.level}
          onChange={(e) =>
            onChange({ ...block, level: Number(e.target.value) as 1 | 2 | 3 })
          }
          className="rounded-md border border-border-1 px-2 py-1.5 text-xs text-fg-2"
        >
          <option value={1}>Grande</option>
          <option value={2}>Médio</option>
          <option value={3}>Pequeno</option>
        </select>
        <AlignButtons value={block.align} onChange={(align) => onChange({ ...block, align })} />
      </div>
    </div>
  );
}
