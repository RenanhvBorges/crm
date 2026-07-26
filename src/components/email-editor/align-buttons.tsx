"use client";

import { TextAlignStart, TextAlignCenter, TextAlignEnd } from "lucide-react";

const OPTIONS = [
  { value: "left" as const, icon: TextAlignStart, label: "Alinhar à esquerda" },
  { value: "center" as const, icon: TextAlignCenter, label: "Centralizar" },
  { value: "right" as const, icon: TextAlignEnd, label: "Alinhar à direita" },
];

export function AlignButtons({
  value,
  onChange,
}: {
  value: "left" | "center" | "right";
  onChange: (value: "left" | "center" | "right") => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border border-border-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-label={opt.label}
          className={`flex items-center justify-center px-2 py-2 ${
            value === opt.value
              ? "bg-oxford-blue text-white"
              : "text-fg-3 hover:bg-bg-surface-2"
          }`}
        >
          <opt.icon size={14} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
