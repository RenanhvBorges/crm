"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { EmailBlock, EmailDocument } from "@/lib/email-blocks";
import type { PlaceholderOption } from "@/lib/email-placeholders";
import { BlockToolbar } from "./block-toolbar";
import { HeadingBlockEditor } from "./blocks/heading-block";
import { TextBlockEditor } from "./blocks/text-block";
import { ImageBlockEditor } from "./blocks/image-block";
import { ButtonBlockEditor } from "./blocks/button-block";
import { DividerBlockEditor } from "./blocks/divider-block";
import { SpacerBlockEditor } from "./blocks/spacer-block";

// Editor de blocos arrastáveis: componente totalmente controlado (o pai é
// dono do EmailDocument). Reordenar reaproveita o mesmo padrão @dnd-kit já
// usado em dashboard-client.tsx (mesmo limiar de ativação do ponteiro).
export function BlockEditor({
  value,
  onChange,
  placeholders,
}: {
  value: EmailDocument;
  onChange: (doc: EmailDocument) => void;
  placeholders: PlaceholderOption[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function updateBlock(id: string, next: EmailBlock) {
    onChange({ blocks: value.blocks.map((b) => (b.id === id ? next : b)) });
  }

  function removeBlock(id: string) {
    onChange({ blocks: value.blocks.filter((b) => b.id !== id) });
  }

  function addBlock(block: EmailBlock) {
    onChange({ blocks: [...value.blocks, block] });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.blocks.findIndex((b) => b.id === active.id);
    const newIndex = value.blocks.findIndex((b) => b.id === over.id);
    onChange({ blocks: arrayMove(value.blocks, oldIndex, newIndex) });
  }

  return (
    <div className="space-y-3">
      <BlockToolbar onAdd={addBlock} />

      {value.blocks.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {value.blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  onChange={(next) => updateBlock(block.id, next)}
                  onDelete={() => removeBlock(block.id)}
                  placeholders={placeholders}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-md border border-dashed border-border-1 px-4 py-6 text-center text-sm text-fg-muted">
          Nenhum bloco ainda. Adicione um acima para começar.
        </p>
      )}
    </div>
  );
}

function BlockRow({
  block,
  onChange,
  onDelete,
  placeholders,
}: {
  block: EmailBlock;
  onChange: (block: EmailBlock) => void;
  onDelete: () => void;
  placeholders: PlaceholderOption[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-lg border border-border-1 bg-oxford-white p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-fg-muted hover:text-fg-2 active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-fg-muted hover:text-danger"
          aria-label="Remover bloco"
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      </div>

      <BlockContent block={block} onChange={onChange} placeholders={placeholders} />
    </div>
  );
}

function BlockContent({
  block,
  onChange,
  placeholders,
}: {
  block: EmailBlock;
  onChange: (block: EmailBlock) => void;
  placeholders: PlaceholderOption[];
}) {
  switch (block.type) {
    case "heading":
      return <HeadingBlockEditor block={block} onChange={onChange} placeholders={placeholders} />;
    case "text":
      return <TextBlockEditor block={block} onChange={onChange} placeholders={placeholders} />;
    case "image":
      return <ImageBlockEditor block={block} onChange={onChange} />;
    case "button":
      return <ButtonBlockEditor block={block} onChange={onChange} placeholders={placeholders} />;
    case "divider":
      return <DividerBlockEditor block={block} onChange={onChange} />;
    case "spacer":
      return <SpacerBlockEditor block={block} onChange={onChange} />;
  }
}
