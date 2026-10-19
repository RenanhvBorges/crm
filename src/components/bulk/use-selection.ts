"use client";

import { useCallback, useMemo, useState } from "react";

// Seleção múltipla sobre uma lista de ids. A seleção é sempre cruzada com os
// ids atuais: linhas que saíram da tela (filtro, exclusão, refresh) deixam de
// contar sem precisar de efeito de sincronização.
export function useSelection(ids: string[]) {
  const [raw, setRaw] = useState<Set<string>>(() => new Set());

  const selected = useMemo(() => {
    const current = new Set(ids);
    const next = new Set<string>();
    raw.forEach((id) => {
      if (current.has(id)) next.add(id);
    });
    return next;
  }, [raw, ids]);

  const toggle = useCallback((id: string) => {
    setRaw((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((targets: string[], on: boolean) => {
    setRaw((prev) => {
      const next = new Set(prev);
      for (const id of targets) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setRaw(new Set()), []);

  const allSelected = ids.length > 0 && selected.size === ids.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = useCallback(
    () => setRaw(allSelected ? new Set() : new Set(ids)),
    [allSelected, ids],
  );

  return {
    selected,
    selectedIds: useMemo(() => Array.from(selected), [selected]),
    count: selected.size,
    isSelected: (id: string) => selected.has(id),
    toggle,
    setMany,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
