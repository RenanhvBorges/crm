"use client";

import type { EmailBlock } from "@/lib/email-blocks";

type DividerBlock = Extract<EmailBlock, { type: "divider" }>;

export function DividerBlockEditor({
  block,
  onChange,
}: {
  block: DividerBlock;
  onChange: (block: DividerBlock) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-fg-2">
        Cor
        <input
          type="color"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
          className="h-7 w-10 rounded border border-border-1"
        />
      </label>
      <hr className="flex-1" style={{ borderTopColor: block.color }} />
    </div>
  );
}
