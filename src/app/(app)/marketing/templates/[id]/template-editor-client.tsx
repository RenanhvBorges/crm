"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil } from "lucide-react";
import { BlockEditor } from "@/components/email-editor/block-editor";
import { EmailPreview } from "@/components/email-editor/email-preview";
import { renderBlocksToHtml, type EmailDocument } from "@/lib/email-blocks";
import type { PlaceholderOption } from "@/lib/email-placeholders";
import { updateTemplateContent } from "../actions";

export function TemplateEditorClient({
  templateId,
  initialContent,
  placeholders,
}: {
  templateId: string;
  initialContent: EmailDocument;
  placeholders: PlaceholderOption[];
}) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(content) !== JSON.stringify(savedContent);

  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg-2">Conteúdo</h2>
        <div className="flex overflow-hidden rounded-md border border-border-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              mode === "edit" ? "bg-oxford-blue text-white" : "text-fg-3 hover:bg-bg-surface-2"
            }`}
          >
            <Pencil size={13} strokeWidth={1.5} />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              mode === "preview" ? "bg-oxford-blue text-white" : "text-fg-3 hover:bg-bg-surface-2"
            }`}
          >
            <Eye size={13} strokeWidth={1.5} />
            Pré-visualizar
          </button>
        </div>
      </div>

      {mode === "edit" ? (
        <BlockEditor value={content} onChange={setContent} placeholders={placeholders} />
      ) : (
        <EmailPreview html={renderBlocksToHtml(content)} />
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await updateTemplateContent(templateId, content);
                setSavedContent(content);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível salvar.");
              }
            });
          }}
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar conteúdo"}
        </button>
        {dirty ? <span className="text-xs text-fg-muted">Alterações não salvas</span> : null}
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </div>
    </div>
  );
}
