"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  toggleTask,
  deleteTask,
  reassignTask,
  updateTaskContact,
  updateTaskDeal,
} from "@/app/(app)/tasks/actions";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { useSelection } from "@/components/bulk/use-selection";
import { useBulkRunner } from "@/components/bulk/bulk-bar";
import { TasksBulkBar } from "@/components/bulk/tasks-bulk-bar";

type ProfileOption = { id: string; full_name: string | null; email: string };

export type TaskListItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
  assignee?: { id: string; full_name: string | null; email: string } | null;
};

export function TaskList({
  tasks: initialTasks,
  profiles,
  contacts,
  deals,
  bulk = false,
}: {
  tasks: TaskListItem[];
  profiles: ProfileOption[];
  contacts?: { id: string; name: string }[];
  deals?: { id: string; title: string }[];
  // Habilita seleção de linhas e ações em massa.
  bulk?: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [syncedFrom, setSyncedFrom] = useState(initialTasks);
  const [, startTransition] = useTransition();

  // Reconcile local (optimistic) state with fresh server data after a refresh.
  if (initialTasks !== syncedFrom) {
    setSyncedFrom(initialTasks);
    setTasks(initialTasks);
  }

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const selection = useSelection(taskIds);
  const runner = useBulkRunner(selection.clear);

  if (!tasks.length) {
    return <p className="py-6 text-center text-sm text-fg-muted">Nenhuma tarefa.</p>;
  }

  function handleAssigneeChange(taskId: string, assignedTo: string | null) {
    const assignee = assignedTo ? (profiles.find((p) => p.id === assignedTo) ?? null) : null;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, assignee } : t)));
    startTransition(async () => {
      await reassignTask(taskId, assignedTo);
      router.refresh();
    });
  }

  function handleContactChange(taskId: string, contactId: string | null) {
    const contact = contactId ? (contacts?.find((c) => c.id === contactId) ?? null) : null;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, contact } : t)));
    startTransition(async () => {
      await updateTaskContact(taskId, contactId);
      router.refresh();
    });
  }

  function handleDealChange(taskId: string, dealId: string | null) {
    const deal = dealId ? (deals?.find((d) => d.id === dealId) ?? null) : null;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, deal } : t)));
    startTransition(async () => {
      await updateTaskDeal(taskId, dealId);
      router.refresh();
    });
  }

  return (
    <>
      {bulk ? (
        <div className="flex items-center gap-3 border-b border-border-1 py-2 text-xs text-fg-3">
          <SelectCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={selection.toggleAll}
            label="Selecionar todas as tarefas"
          />
          {selection.count
            ? `${selection.count} de ${tasks.length} selecionadas`
            : "Selecionar todas"}
        </div>
      ) : null}
      <ul className="divide-y divide-border-1">
        {tasks.map((task) => {
          const isDone = task.status === "done";
          const isOverdue = !isDone && task.due_date && new Date(task.due_date) < new Date();

          return (
            <li
              key={task.id}
              className={`flex items-center gap-3 py-3 ${
                bulk && selection.isSelected(task.id) ? "bg-oxford-blue-50" : ""
              }`}
            >
              {bulk ? (
                <SelectCheckbox
                  checked={selection.isSelected(task.id)}
                  onChange={() => selection.toggle(task.id)}
                  label={`Selecionar tarefa ${task.title}`}
                />
              ) : null}
              <input
                type="checkbox"
                aria-label={isDone ? "Reabrir tarefa" : "Concluir tarefa"}
                title={isDone ? "Reabrir tarefa" : "Concluir tarefa"}
                checked={isDone}
                onChange={(e) => {
                  const done = e.target.checked;
                  setTasks((prev) =>
                    prev.map((t) =>
                      t.id === task.id ? { ...t, status: done ? "done" : "pending" } : t,
                    ),
                  );
                  startTransition(async () => {
                    await toggleTask(task.id, done);
                    router.refresh();
                  });
                }}
                className="h-4 w-4 shrink-0"
              />
              <div className="flex-1">
                <p className={isDone ? "text-sm text-fg-muted line-through" : "text-sm text-fg-1"}>
                  {task.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-3">
                  {task.due_date ? (
                    <span className={isOverdue ? "text-danger" : ""}>
                      {new Date(task.due_date).toLocaleDateString("pt-BR")}
                    </span>
                  ) : null}

                  <select
                    value={task.assignee?.id ?? ""}
                    onChange={(e) => handleAssigneeChange(task.id, e.target.value || null)}
                    className="rounded border border-border-1 bg-transparent px-1 py-0.5 text-xs"
                    aria-label="Responsável"
                  >
                    <option value="">Sem responsável</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name ?? p.email}
                      </option>
                    ))}
                  </select>

                  {contacts ? (
                    <select
                      value={task.contact?.id ?? ""}
                      onChange={(e) => handleContactChange(task.id, e.target.value || null)}
                      className="rounded border border-border-1 bg-transparent px-1 py-0.5 text-xs"
                      aria-label="Contato"
                    >
                      <option value="">Sem contato</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : task.contact ? (
                    <Link href={`/contacts/${task.contact.id}`} className="hover:underline">
                      {task.contact.name}
                    </Link>
                  ) : null}

                  {deals ? (
                    <select
                      value={task.deal?.id ?? ""}
                      onChange={(e) => handleDealChange(task.id, e.target.value || null)}
                      className="rounded border border-border-1 bg-transparent px-1 py-0.5 text-xs"
                      aria-label="Negócio"
                    >
                      <option value="">Sem negócio</option>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  ) : task.deal ? (
                    <span>{task.deal.title}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTasks((prev) => prev.filter((t) => t.id !== task.id));
                  startTransition(async () => {
                    await deleteTask(task.id);
                    router.refresh();
                  });
                }}
                className="text-fg-muted hover:text-danger"
                aria-label="Excluir tarefa"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </li>
          );
        })}
      </ul>
      {bulk ? (
        <TasksBulkBar
          ids={selection.selectedIds}
          profiles={profiles}
          runner={runner}
          onClear={selection.clear}
        />
      ) : null}
    </>
  );
}
