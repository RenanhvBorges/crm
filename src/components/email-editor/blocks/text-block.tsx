"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link2 } from "lucide-react";
import type { EmailBlock } from "@/lib/email-blocks";
import { sanitizeInlineHtml } from "@/lib/email-blocks";
import { PlaceholderPicker } from "@/components/email-placeholder-picker";
import { AlignButtons } from "@/components/email-editor/align-buttons";
import type { PlaceholderOption } from "@/lib/email-placeholders";

type TextBlock = Extract<EmailBlock, { type: "text" }>;

// contentEditable não controlado pelo React: o innerHTML é escrito uma única
// vez na montagem; alterações voltam pro estado do documento só no blur, via
// sanitizeInlineHtml — evitar re-injetar innerHTML a cada render, senão o
// cursor pula.
export function TextBlockEditor({
  block,
  onChange,
  placeholders,
}: {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
  placeholders: PlaceholderOption[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current && ref.current) {
      ref.current.innerHTML = block.html;
      mounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit() {
    if (!ref.current) return;
    onChange({ ...block, html: sanitizeInlineHtml(ref.current.innerHTML) });
  }

  function exec(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    commit();
  }

  function insertPlaceholder(token: string) {
    ref.current?.focus();
    document.execCommand("insertText", false, token);
    commit();
  }

  function insertLink() {
    const url = window.prompt("URL do link:");
    if (!url) return;
    exec("createLink", url);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
          className="rounded p-1.5 text-fg-3 hover:bg-bg-surface-2"
          aria-label="Negrito"
        >
          <Bold size={14} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
          className="rounded p-1.5 text-fg-3 hover:bg-bg-surface-2"
          aria-label="Itálico"
        >
          <Italic size={14} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
          className="rounded p-1.5 text-fg-3 hover:bg-bg-surface-2"
          aria-label="Sublinhado"
        >
          <Underline size={14} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="rounded p-1.5 text-fg-3 hover:bg-bg-surface-2"
          aria-label="Link"
        >
          <Link2 size={14} strokeWidth={1.5} />
        </button>
        <div className="flex-1" />
        <AlignButtons value={block.align} onChange={(align) => onChange({ ...block, align })} />
        <PlaceholderPicker options={placeholders} onInsert={insertPlaceholder} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        style={{ textAlign: block.align }}
        className="min-h-[80px] rounded-md border border-border-1 px-3 py-2 text-sm text-fg-1 focus:border-border-brand focus:outline-none"
      />
    </div>
  );
}
