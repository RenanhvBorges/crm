"use client";

import { useState } from "react";

type Option = { id: string; label: string };

export function AudiencePicker({
  contacts,
  lists,
  defaultType = "list",
  defaultContactId,
  defaultListId,
}: {
  contacts: Option[];
  lists: Option[];
  defaultType?: "contact" | "list";
  defaultContactId?: string | null;
  defaultListId?: string | null;
}) {
  const [type, setType] = useState<"contact" | "list">(defaultType);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-fg-2">Público</label>
      <div className="mb-2 flex gap-4 text-sm text-fg-2">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="audience_type"
            value="list"
            checked={type === "list"}
            onChange={() => setType("list")}
          />
          Lista de contatos
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="audience_type"
            value="contact"
            checked={type === "contact"}
            onChange={() => setType("contact")}
          />
          Um contato
        </label>
      </div>

      {type === "list" ? (
        <select
          name="audience_list_id"
          required
          defaultValue={defaultListId ?? ""}
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        >
          <option value="" disabled>
            Selecione uma lista
          </option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      ) : (
        <select
          name="audience_contact_id"
          required
          defaultValue={defaultContactId ?? ""}
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        >
          <option value="" disabled>
            Selecione um contato
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
