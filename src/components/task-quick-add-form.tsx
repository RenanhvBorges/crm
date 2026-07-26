"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/app/(app)/tasks/actions";

type ProfileOption = { id: string; full_name: string | null; email: string };

export function TaskQuickAddForm({
  contactId,
  dealId,
  currentUserId,
  profiles,
  contacts,
  deals,
}: {
  contactId?: string;
  dealId?: string;
  currentUserId: string;
  profiles: ProfileOption[];
  contacts?: { id: string; name: string }[];
  deals?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedDealId, setSelectedDealId] = useState("");

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await createTask(formData);
          formRef.current?.reset();
          // .reset() só limpa inputs não controlados (title/due_date) — os
          // selects abaixo são controlados e precisam ser resetados aqui.
          setAssignedTo(currentUserId);
          setSelectedContactId("");
          setSelectedDealId("");
          router.refresh();
        });
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-[160px] flex-1">
        <input
          name="title"
          required
          placeholder="Nova tarefa..."
          className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
      </div>
      <input
        name="due_date"
        type="date"
        className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
      />

      <select
        name="assigned_to"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
        className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
      >
        <option value="">Sem responsável</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name ?? p.email}
          </option>
        ))}
      </select>

      {contactId ? (
        <input type="hidden" name="contact_id" value={contactId} />
      ) : (
        <select
          name="contact_id"
          value={selectedContactId}
          onChange={(e) => setSelectedContactId(e.target.value)}
          className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        >
          <option value="">Nenhum contato</option>
          {(contacts ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {dealId ? (
        <input type="hidden" name="deal_id" value={dealId} />
      ) : (
        <select
          name="deal_id"
          value={selectedDealId}
          onChange={(e) => setSelectedDealId(e.target.value)}
          className="rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        >
          <option value="">Nenhum negócio</option>
          {(deals ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60"
      >
        Adicionar
      </button>
    </form>
  );
}
