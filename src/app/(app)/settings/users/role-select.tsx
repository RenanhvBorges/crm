"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  comum: "Comum",
  diretor_comercial: "Diretor comercial",
};

export function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return <span className="text-sm text-fg-2">{ROLE_LABELS[currentRole] ?? currentRole}</span>;
  }

  return (
    <div>
      <select
        defaultValue={currentRole}
        disabled={isPending}
        onChange={(e) => {
          const role = e.target.value;
          setError(null);
          startTransition(async () => {
            try {
              await updateUserRole(userId, role);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Não foi possível alterar o role.");
            }
          });
        }}
        className="rounded-md border border-border-1 px-2 py-1 text-sm focus:border-border-brand focus:outline-none disabled:opacity-60"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
