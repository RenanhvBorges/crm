export type DealStatus = "open" | "won" | "lost";

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

export const DEAL_STATUS_BADGE: Record<DealStatus, string> = {
  open: "bg-oxford-blue-50 text-oxford-blue",
  won: "bg-success-bg text-success",
  lost: "bg-danger-bg text-danger",
};

// Convenção do funil: mover para um estágio chamado "Ganho"/"Perdido" fecha o negócio.
export function statusForStageName(name: string | null | undefined): DealStatus {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("ganho")) return "won";
  if (normalized.includes("perdido")) return "lost";
  return "open";
}

export function isDealStatus(value: unknown): value is DealStatus {
  return value === "open" || value === "won" || value === "lost";
}
