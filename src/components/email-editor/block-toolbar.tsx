"use client";

import { Heading, Type, Image, MousePointerClick, Minus, MoveVertical, type LucideIcon } from "lucide-react";
import { newBlockId, type EmailBlock } from "@/lib/email-blocks";

const BLOCK_FACTORIES: { label: string; icon: LucideIcon; create: () => EmailBlock }[] = [
  {
    label: "Título",
    icon: Heading,
    create: () => ({ id: newBlockId(), type: "heading", text: "", level: 2, align: "left" }),
  },
  {
    label: "Texto",
    icon: Type,
    create: () => ({ id: newBlockId(), type: "text", html: "", align: "left" }),
  },
  {
    label: "Imagem",
    icon: Image,
    create: () => ({ id: newBlockId(), type: "image", src: "", alt: "", align: "center" }),
  },
  {
    label: "Botão",
    icon: MousePointerClick,
    create: () => ({
      id: newBlockId(),
      type: "button",
      label: "Clique aqui",
      href: "",
      align: "center",
      bgColor: "#263fa3",
      textColor: "#ffffff",
    }),
  },
  {
    label: "Divisor",
    icon: Minus,
    create: () => ({ id: newBlockId(), type: "divider", color: "#e5e7eb" }),
  },
  {
    label: "Espaço",
    icon: MoveVertical,
    create: () => ({ id: newBlockId(), type: "spacer", height: 24 }),
  },
];

export function BlockToolbar({ onAdd }: { onAdd: (block: EmailBlock) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BLOCK_FACTORIES.map((f) => (
        <button
          key={f.label}
          type="button"
          onClick={() => onAdd(f.create())}
          className="flex items-center gap-1.5 rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2"
        >
          <f.icon size={14} strokeWidth={1.5} />
          {f.label}
        </button>
      ))}
    </div>
  );
}
