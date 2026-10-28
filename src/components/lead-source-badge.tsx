import { LEAD_SOURCES } from "@/lib/lead-source";

export function LeadSourceBadge({ source }: { source: string | null | undefined }) {
  const def = LEAD_SOURCES.find((s) => s.value === source);
  if (!def) return <span className="text-fg-muted">—</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${def.className}`}>
      {def.label}
    </span>
  );
}
