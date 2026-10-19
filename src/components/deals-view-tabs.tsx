import Link from "next/link";

export type DealsView = "open" | "closed" | "won" | "lost";

const TABS: { view: DealsView; label: string; href: string }[] = [
  { view: "open", label: "Em aberto", href: "/deals" },
  { view: "closed", label: "Fechados", href: "/deals/closed" },
  { view: "won", label: "Ganhos", href: "/deals/closed?status=won" },
  { view: "lost", label: "Perdidos", href: "/deals/closed?status=lost" },
];

// Alterna entre o funil (negócios em aberto) e as listas de negócios fechados.
export function DealsViewTabs({
  active,
  counts,
}: {
  active: DealsView;
  counts?: Partial<Record<DealsView, number>>;
}) {
  return (
    <nav aria-label="Visão dos negócios" className="mt-2 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const count = counts?.[tab.view];
        return (
          <Link
            key={tab.view}
            href={tab.href}
            aria-current={tab.view === active ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs ${
              tab.view === active
                ? "bg-oxford-blue text-white"
                : "bg-bg-surface-2 text-fg-2 hover:bg-oxford-blue-50"
            }`}
          >
            {tab.label}
            {count !== undefined ? ` · ${count}` : ""}
          </Link>
        );
      })}
    </nav>
  );
}
