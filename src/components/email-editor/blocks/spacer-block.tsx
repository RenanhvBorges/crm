"use client";

import type { EmailBlock } from "@/lib/email-blocks";

type SpacerBlock = Extract<EmailBlock, { type: "spacer" }>;

export function SpacerBlockEditor({
  block,
  onChange,
}: {
  block: SpacerBlock;
  onChange: (block: SpacerBlock) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-fg-2">
      Altura do espaço (px)
      <input
        type="number"
        min={4}
        max={200}
        value={block.height}
        onChange={(e) => onChange({ ...block, height: Number(e.target.value) || 0 })}
        className="w-24 rounded-md border border-border-1 px-2 py-1.5 text-sm focus:border-border-brand focus:outline-none"
      />
    </label>
  );
}
