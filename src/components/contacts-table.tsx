"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Columns3, Filter, Plus, X } from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { useSelection } from "@/components/bulk/use-selection";
import { useBulkRunner } from "@/components/bulk/bulk-bar";
import { ContactsBulkBar, type ContactsBulkConfig } from "@/components/bulk/contacts-bulk-bar";
import type { ScoringTier } from "@/lib/scoring";
import {
  REQUIRED_COLUMN_KEY,
  DEFAULT_VISIBLE_COLUMNS,
  columnMap,
  contactMatchesFilters,
  getColumnValue,
  filterOperatorsForType,
  FILTER_OPERATOR_LABELS,
  NO_VALUE_FILTER_OPERATORS,
  type ColumnDef,
  type ContactRow,
  type FilterOperator,
  type ViewConfig,
  type ViewFilter,
} from "@/lib/contact-columns";

const inputClass =
  "w-full rounded-md border border-border-1 px-2 py-1.5 text-sm focus:border-border-brand focus:outline-none";

export function ContactsTable({
  viewKey,
  contacts,
  allColumns,
  tiers,
  initialConfig,
  saveAction,
  removeAction,
  removeConfirmMessage,
  bulk,
}: {
  viewKey: string;
  contacts: ContactRow[];
  allColumns: ColumnDef[];
  tiers: ScoringTier[];
  initialConfig: ViewConfig;
  saveAction: (viewKey: string, config: ViewConfig) => Promise<void>;
  // Ação opcional de remover a linha (ex.: tirar contato de uma lista).
  removeAction?: (contactId: string) => Promise<void>;
  removeConfirmMessage?: string;
  // Habilita seleção de linhas e ações em massa.
  bulk?: ContactsBulkConfig;
}) {
  const colsByKey = useMemo(() => columnMap(allColumns), [allColumns]);
  const [config, setConfig] = useState<ViewConfig>(() => normalizeConfig(initialConfig, allColumns));

  // Persiste (debounced) sempre que a config muda, exceto na montagem inicial.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      saveAction(viewKey, config).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [config, saveAction, viewKey]);

  const visibleColumns = useMemo(
    () => config.columns.map((k) => colsByKey[k]).filter(Boolean),
    [config.columns, colsByKey],
  );

  // Só aplica filtros "completos" (com coluna válida e valor quando exigido).
  const activeFilters = useMemo(
    () =>
      config.filters.filter((f) => {
        const col = colsByKey[f.column];
        if (!col) return false;
        return NO_VALUE_FILTER_OPERATORS.includes(f.operator) || f.value.trim() !== "";
      }),
    [config.filters, colsByKey],
  );

  const filteredContacts = useMemo(
    () => contacts.filter((c) => contactMatchesFilters(c, activeFilters, colsByKey)),
    [contacts, activeFilters, colsByKey],
  );

  // Seleção sobre as linhas visíveis (já filtradas): "selecionar todos" nunca
  // pega contatos escondidos por um filtro.
  const filteredIds = useMemo(() => filteredContacts.map((c) => c.id), [filteredContacts]);
  const selection = useSelection(filteredIds);
  const runner = useBulkRunner(selection.clear);
  const selectedContacts = useMemo(
    () => filteredContacts.filter((c) => selection.selected.has(c.id)),
    [filteredContacts, selection.selected],
  );

  function toggleColumn(key: string) {
    setConfig((prev) => {
      if (prev.columns.includes(key)) {
        if (key === REQUIRED_COLUMN_KEY) return prev;
        return { ...prev, columns: prev.columns.filter((k) => k !== key) };
      }
      return { ...prev, columns: [...prev.columns, key] };
    });
  }

  function addFilter() {
    const col = allColumns[0];
    const operator = filterOperatorsForType(col.type)[0];
    setConfig((prev) => ({
      ...prev,
      filters: [...prev.filters, { column: col.key, operator, value: "" }],
    }));
  }

  function updateFilter(index: number, patch: Partial<ViewFilter>) {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  function removeFilter(index: number) {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ColumnsPicker
          allColumns={allColumns}
          visibleKeys={config.columns}
          onToggle={toggleColumn}
        />
        <FiltersButton
          filters={config.filters}
          allColumns={allColumns}
          onAdd={addFilter}
          onUpdate={updateFilter}
          onRemove={removeFilter}
        />
        {activeFilters.length ? (
          <span className="text-xs text-fg-3">
            {filteredContacts.length} de {contacts.length}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-1 bg-oxford-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-1 bg-bg-surface-2 text-left text-xs uppercase tracking-wide text-fg-3">
            <tr>
              {bulk ? (
                <th className="w-10 px-4 py-3">
                  <SelectCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    label="Selecionar todos os contatos"
                  />
                </th>
              ) : null}
              {visibleColumns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {removeAction ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => (
              <tr
                key={contact.id}
                className={`border-b border-border-1 last:border-0 ${
                  selection.isSelected(contact.id) ? "bg-oxford-blue-50" : ""
                }`}
              >
                {bulk ? (
                  <td className="w-10 px-4 py-3 align-top">
                    <SelectCheckbox
                      checked={selection.isSelected(contact.id)}
                      onChange={() => selection.toggle(contact.id)}
                      label={`Selecionar ${contact.name}`}
                    />
                  </td>
                ) : null}
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-4 py-3 align-top">
                    <Cell contact={contact} col={col} tiers={tiers} />
                  </td>
                ))}
                {removeAction ? (
                  <td className="px-4 py-3 text-right align-top">
                    <DeleteFieldButton
                      fieldId={contact.id}
                      deleteAction={removeAction}
                      confirmMessage={removeConfirmMessage ?? "Remover este contato?"}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {!filteredContacts.length ? (
              <tr>
                <td
                  colSpan={Math.max(
                    visibleColumns.length + (removeAction ? 1 : 0) + (bulk ? 1 : 0),
                    1,
                  )}
                  className="px-4 py-8 text-center text-fg-muted"
                >
                  {contacts.length
                    ? "Nenhum contato corresponde aos filtros."
                    : "Nenhum contato encontrado."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {bulk ? (
        <ContactsBulkBar
          selected={selectedContacts}
          visibleColumns={visibleColumns}
          config={bulk}
          runner={runner}
          onClear={selection.clear}
        />
      ) : null}
    </div>
  );
}

function Cell({
  contact,
  col,
  tiers,
}: {
  contact: ContactRow;
  col: ColumnDef;
  tiers: ScoringTier[];
}) {
  const raw = getColumnValue(contact, col);

  if (col.key === "name") {
    return (
      <Link
        href={`/contacts/${contact.id}`}
        className="font-medium text-fg-brand hover:underline"
      >
        {contact.name}
      </Link>
    );
  }

  if (col.key === "score") {
    return <ScoreBadge score={contact.score} tiers={tiers} />;
  }

  if (col.type === "tags" || Array.isArray(raw)) {
    const values = Array.isArray(raw) ? (raw as unknown[]).map(String) : [];
    if (!values.length) return <span className="text-fg-muted">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span
            key={v}
            className="rounded-full bg-oxford-blue-50 px-2 py-0.5 text-xs text-oxford-blue"
          >
            {v}
          </span>
        ))}
      </div>
    );
  }

  if (col.type === "boolean") {
    if (raw === null || raw === undefined || raw === "")
      return <span className="text-fg-muted">—</span>;
    return <span className="text-fg-2">{raw ? "Sim" : "Não"}</span>;
  }

  if (raw === null || raw === undefined || raw === "") {
    return <span className="text-fg-muted">—</span>;
  }

  return <span className="text-fg-2">{String(raw)}</span>;
}

// -------------------- Popover base --------------------

function Popover({
  label,
  icon,
  badge,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border-1 bg-oxford-white px-3 py-1.5 text-sm text-fg-2 hover:bg-bg-surface-2"
      >
        {icon}
        {label}
        {badge ? (
          <span className="rounded-full bg-oxford-blue px-1.5 text-xs text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-80 rounded-lg border border-border-1 bg-oxford-white p-3 shadow-lg">
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ColumnsPicker({
  allColumns,
  visibleKeys,
  onToggle,
}: {
  allColumns: ColumnDef[];
  visibleKeys: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <Popover label="Colunas" icon={<Columns3 size={15} strokeWidth={1.5} />}>
      <p className="mb-2 text-xs font-medium text-fg-3">Colunas visíveis</p>
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {allColumns.map((col) => {
          const checked = visibleKeys.includes(col.key);
          const required = col.key === REQUIRED_COLUMN_KEY;
          return (
            <li key={col.key}>
              <label
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  required ? "text-fg-muted" : "text-fg-2 hover:bg-bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  disabled={required}
                  onChange={() => onToggle(col.key)}
                />
                {col.label}
                {col.source === "custom" ? (
                  <span className="ml-auto text-xs text-fg-muted">campo</span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}

function FiltersButton({
  filters,
  allColumns,
  onAdd,
  onUpdate,
  onRemove,
}: {
  filters: ViewFilter[];
  allColumns: ColumnDef[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<ViewFilter>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Popover
      label="Filtros"
      icon={<Filter size={15} strokeWidth={1.5} />}
      badge={filters.length || undefined}
    >
      <div className="w-full">
        {filters.length ? (
          <ul className="mb-2 space-y-2">
            {filters.map((filter, index) => {
              const col = allColumns.find((c) => c.key === filter.column) ?? allColumns[0];
              const operators = filterOperatorsForType(col.type);
              const needsValue = !NO_VALUE_FILTER_OPERATORS.includes(filter.operator);
              return (
                <li key={index} className="rounded-md border border-border-1 p-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={filter.column}
                      onChange={(e) => {
                        const nextCol = allColumns.find((c) => c.key === e.target.value)!;
                        onUpdate(index, {
                          column: nextCol.key,
                          operator: filterOperatorsForType(nextCol.type)[0],
                          value: "",
                        });
                      }}
                      className={inputClass}
                    >
                      {allColumns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="shrink-0 text-fg-muted hover:text-danger"
                      aria-label="Remover filtro"
                    >
                      <X size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  <select
                    value={filter.operator}
                    onChange={(e) =>
                      onUpdate(index, { operator: e.target.value as FilterOperator })
                    }
                    className={`${inputClass} mt-1`}
                  >
                    {operators.map((op) => (
                      <option key={op} value={op}>
                        {FILTER_OPERATOR_LABELS[op]}
                      </option>
                    ))}
                  </select>
                  {needsValue ? (
                    <input
                      type={
                        col.type === "number" || col.type === "score"
                          ? "number"
                          : col.type === "date"
                            ? "date"
                            : "text"
                      }
                      value={filter.value}
                      onChange={(e) => onUpdate(index, { value: e.target.value })}
                      placeholder="valor"
                      className={`${inputClass} mt-1`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mb-2 text-xs text-fg-muted">Nenhum filtro aplicado.</p>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-sm text-fg-brand hover:underline"
        >
          <Plus size={14} strokeWidth={1.5} />
          Adicionar filtro
        </button>
      </div>
    </Popover>
  );
}

// Garante colunas válidas, sem duplicatas e com a coluna obrigatória presente.
// Tolerante a config ausente/malformada (ex.: linha antiga com config vazio).
function normalizeConfig(config: ViewConfig | null | undefined, allColumns: ColumnDef[]): ViewConfig {
  const valid = new Set(allColumns.map((c) => c.key));
  const rawColumns = Array.isArray(config?.columns)
    ? config.columns
    : DEFAULT_VISIBLE_COLUMNS;
  const rawFilters = Array.isArray(config?.filters) ? config.filters : [];

  const seen = new Set<string>();
  const columns = rawColumns.filter((k) => {
    if (typeof k !== "string" || !valid.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!columns.includes(REQUIRED_COLUMN_KEY) && valid.has(REQUIRED_COLUMN_KEY)) {
    columns.unshift(REQUIRED_COLUMN_KEY);
  }
  return { columns, filters: rawFilters };
}
