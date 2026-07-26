"use client";

import type { EmailBlock } from "@/lib/email-blocks";
import { AlignButtons } from "@/components/email-editor/align-buttons";

type ImageBlock = Extract<EmailBlock, { type: "image" }>;

export function ImageBlockEditor({
  block,
  onChange,
}: {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={block.src}
          onChange={(e) => onChange({ ...block, src: e.target.value })}
          placeholder="URL da imagem (https://...)"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
        <AlignButtons value={block.align} onChange={(align) => onChange({ ...block, align })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Texto alternativo"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-xs focus:border-border-brand focus:outline-none"
        />
        <input
          value={block.href ?? ""}
          onChange={(e) => onChange({ ...block, href: e.target.value || undefined })}
          placeholder="Link ao clicar (opcional)"
          className="w-full rounded-md border border-border-1 px-3 py-2 text-xs focus:border-border-brand focus:outline-none"
        />
      </div>
      {block.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview de URL arbitrária do usuário, sem otimização do Next
        <img
          src={block.src}
          alt={block.alt}
          className="max-h-40 rounded-md border border-border-1 object-contain"
          style={{
            marginLeft: block.align === "center" ? "auto" : undefined,
            marginRight: block.align === "center" || block.align === "left" ? "auto" : undefined,
            display: "block",
          }}
        />
      ) : (
        <p className="text-xs text-fg-muted">Cole a URL de uma imagem para pré-visualizar.</p>
      )}
    </div>
  );
}
