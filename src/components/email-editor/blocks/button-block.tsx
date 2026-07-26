"use client";

import { useRef } from "react";
import type { EmailBlock } from "@/lib/email-blocks";
import { PlaceholderPicker } from "@/components/email-placeholder-picker";
import { AlignButtons } from "@/components/email-editor/align-buttons";
import type { PlaceholderOption } from "@/lib/email-placeholders";

type ButtonBlock = Extract<EmailBlock, { type: "button" }>;

export function ButtonBlockEditor({
  block,
  onChange,
  placeholders,
}: {
  block: ButtonBlock;
  onChange: (block: ButtonBlock) => void;
  placeholders: PlaceholderOption[];
}) {
  const ref = useRef<HTMLInputElement>(null);

  function insert(token: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? block.label.length;
    const end = el?.selectionEnd ?? block.label.length;
    const next = block.label.slice(0, start) + token + block.label.slice(end);
    onChange({ ...block, label: next });
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
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Texto do botão"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
        <PlaceholderPicker options={placeholders} onInsert={insert} />
      </div>
      <input
        value={block.href}
        onChange={(e) => onChange({ ...block, href: e.target.value })}
        placeholder="URL do link (https://...)"
        className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-fg-2">
          Fundo
          <input
            type="color"
            value={block.bgColor}
            onChange={(e) => onChange({ ...block, bgColor: e.target.value })}
            className="h-7 w-10 rounded border border-border-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-fg-2">
          Texto
          <input
            type="color"
            value={block.textColor}
            onChange={(e) => onChange({ ...block, textColor: e.target.value })}
            className="h-7 w-10 rounded border border-border-1"
          />
        </label>
        <AlignButtons value={block.align} onChange={(align) => onChange({ ...block, align })} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent:
            block.align === "center" ? "center" : block.align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <span
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: block.bgColor, color: block.textColor }}
        >
          {block.label || "Texto do botão"}
        </span>
      </div>
    </div>
  );
}
