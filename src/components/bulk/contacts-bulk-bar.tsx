"use client";

import { useMemo, useState } from "react";
import { Download, ListPlus, ListX, Tag, Tags, Trash2 } from "lucide-react";
import { TagInput, type CatalogTag } from "@/components/tag-input";
import { createTagFromPicker } from "@/app/(app)/contacts/tags/actions";
import { bulkAddTags, bulkDeleteContacts, bulkRemoveTags } from "@/app/(app)/contacts/actions";
import {
  bulkAddContactsToList,
  bulkRemoveContactsFromList,
} from "@/app/(app)/contacts/lists/actions";
import { getColumnValue, type ColumnDef, type ContactRow } from "@/lib/contact-columns";
import { csvFilename, downloadCsv } from "@/lib/csv";
import {
  BulkBar,
  BulkButton,
  BulkMenu,
  MenuApplyButton,
  menuSelectClass,
  type BulkRunner,
} from "./bulk-bar";

export type ContactsBulkConfig = {
  tagCatalog: CatalogTag[];
  lists: { id: string; name: string }[];
  // Quando a tabela é a de uma lista: habilita "Remover da lista".
  currentListId?: string;
};

function csvValue(contact: ContactRow, col: ColumnDef): string {
  const raw = getColumnValue(contact, col);
  if (raw === null || raw === undefined) return "";
  if (Array.isArray(raw)) return raw.map(String).join(", ");
  if (col.type === "boolean") return raw ? "Sim" : "Não";
  return String(raw);
}

export function ContactsBulkBar({
  selected,
  visibleColumns,
  config,
  runner,
  onClear,
}: {
  selected: ContactRow[];
  visibleColumns: ColumnDef[];
  config: ContactsBulkConfig;
  runner: BulkRunner;
  onClear: () => void;
}) {
  const ids = useMemo(() => selected.map((c) => c.id), [selected]);
  const { run, isPending } = runner;

  function exportCsv() {
    downloadCsv(
      csvFilename("contatos"),
      visibleColumns.map((c) => c.label),
      selected.map((contact) => visibleColumns.map((col) => csvValue(contact, col))),
    );
  }

  const targetLists = config.lists.filter((l) => l.id !== config.currentListId);

  return (
    <BulkBar
      count={selected.length}
      singular="selecionado"
      plural="selecionados"
      runner={runner}
      onClear={onClear}
    >
      <BulkMenu
        label="Adicionar tags"
        icon={<Tag size={14} strokeWidth={1.5} />}
        disabled={isPending}
      >
        {(close) => (
          <AddTagsPanel
            catalog={config.tagCatalog}
            disabled={isPending}
            onApply={(tags) => {
              close();
              run(() => bulkAddTags(ids, tags));
            }}
          />
        )}
      </BulkMenu>

      <BulkMenu
        label="Remover tags"
        icon={<Tags size={14} strokeWidth={1.5} />}
        disabled={isPending}
      >
        {(close) => (
          <RemoveTagsPanel
            selected={selected}
            catalog={config.tagCatalog}
            disabled={isPending}
            onApply={(tags) => {
              close();
              run(() => bulkRemoveTags(ids, tags));
            }}
          />
        )}
      </BulkMenu>

      {targetLists.length ? (
        <BulkMenu
          label="Adicionar à lista"
          icon={<ListPlus size={14} strokeWidth={1.5} />}
          disabled={isPending}
        >
          {(close) => (
            <AddToListPanel
              lists={targetLists}
              disabled={isPending}
              onApply={(listId) => {
                close();
                run(() => bulkAddContactsToList(listId, ids));
              }}
            />
          )}
        </BulkMenu>
      ) : null}

      {config.currentListId ? (
        <BulkButton
          label="Remover da lista"
          icon={<ListX size={14} strokeWidth={1.5} />}
          disabled={isPending}
          onClick={() =>
            run(() => bulkRemoveContactsFromList(config.currentListId!, ids), {
              confirm: `Remover ${selected.length} contato(s) desta lista? Os contatos não são apagados.`,
            })
          }
        />
      ) : null}

      <BulkButton
        label="Exportar CSV"
        icon={<Download size={14} strokeWidth={1.5} />}
        onClick={exportCsv}
      />

      <BulkButton
        label="Excluir"
        danger
        icon={<Trash2 size={14} strokeWidth={1.5} />}
        disabled={isPending}
        onClick={() =>
          run(() => bulkDeleteContacts(ids), {
            confirm: `Excluir ${selected.length} contato(s)? Esta ação não pode ser desfeita.`,
          })
        }
      />
    </BulkBar>
  );
}

function AddTagsPanel({
  catalog,
  disabled,
  onApply,
}: {
  catalog: CatalogTag[];
  disabled: boolean;
  onApply: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-fg-3">Tags a adicionar</p>
      <TagInput
        value={tags}
        onChange={setTags}
        catalog={catalog}
        onCreate={createTagFromPicker}
        dropUp
      />
      <MenuApplyButton
        label="Adicionar tags"
        disabled={disabled || tags.length === 0}
        onClick={() => onApply(tags)}
      />
    </div>
  );
}

function RemoveTagsPanel({
  selected,
  catalog,
  disabled,
  onApply,
}: {
  selected: ContactRow[];
  catalog: CatalogTag[];
  disabled: boolean;
  onApply: (tags: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  // Só faz sentido oferecer tags que algum dos contatos selecionados possui.
  const present = useMemo(() => {
    const counts = new Map<string, number>();
    for (const contact of selected) {
      for (const tag of contact.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [selected]);

  const colorOf = (name: string) =>
    catalog.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color ?? "#263fa3";

  if (!present.length) {
    return <p className="text-sm text-fg-muted">Os contatos selecionados não têm tags.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-fg-3">Tags a remover</p>
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {present.map(({ name, count }) => {
          const on = chosen.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setChosen((prev) => (on ? prev.filter((t) => t !== name) : [...prev, name]))
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                on
                  ? "border-transparent text-white"
                  : "border-border-1 text-fg-2 hover:bg-bg-surface-2"
              }`}
              style={on ? { backgroundColor: colorOf(name) } : undefined}
            >
              {name}
              <span className={on ? "text-white/80" : "text-fg-muted"}>{count}</span>
            </button>
          );
        })}
      </div>
      <MenuApplyButton
        label="Remover tags"
        disabled={disabled || chosen.length === 0}
        onClick={() => onApply(chosen)}
      />
    </div>
  );
}

function AddToListPanel({
  lists,
  disabled,
  onApply,
}: {
  lists: { id: string; name: string }[];
  disabled: boolean;
  onApply: (listId: string) => void;
}) {
  const [listId, setListId] = useState("");
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-fg-3">Lista de destino</p>
      <select
        value={listId}
        onChange={(e) => setListId(e.target.value)}
        className={menuSelectClass}
      >
        <option value="">Selecione...</option>
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <MenuApplyButton
        label="Adicionar à lista"
        disabled={disabled || !listId}
        onClick={() => onApply(listId)}
      />
    </div>
  );
}
