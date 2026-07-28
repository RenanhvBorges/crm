"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  Settings,
  ChevronDown,
  List,
  SlidersHorizontal,
  Tag,
  Contact,
  Gauge,
  GitBranch,
  LayoutGrid,
  KeyRound,
  UserCog,
  Braces,
  Mail,
  Send,
  LayoutTemplate,
  ChartColumn,
  Workflow,
  Webhook,
  type LucideIcon,
} from "lucide-react";

type NavChild = { href: string; label: string; icon: LucideIcon };
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
};

function getNavItems(isDirector: boolean): NavItem[] {
  return [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/contacts",
      label: "Contatos",
      icon: Users,
      children: [
        { href: "/contacts", label: "Todos os contatos", icon: Contact },
        { href: "/contacts/lists", label: "Listas", icon: List },
        { href: "/contacts/fields", label: "Campos", icon: SlidersHorizontal },
        { href: "/contacts/tags", label: "Tags", icon: Tag },
        { href: "/contacts/scoring", label: "Lead Scoring", icon: Gauge },
      ],
    },
    {
      href: "/deals",
      label: "Negócios",
      icon: KanbanSquare,
      children: [
        { href: "/deals", label: "Funil", icon: KanbanSquare },
        { href: "/deals/fields", label: "Campos", icon: SlidersHorizontal },
        { href: "/deals/pipelines", label: "Configurações de funil", icon: GitBranch },
      ],
    },
    {
      href: "/marketing",
      label: "Marketing",
      icon: Mail,
      children: [
        { href: "/marketing/campaigns", label: "Campanhas", icon: Send },
        { href: "/marketing/templates", label: "Templates de e-mail", icon: LayoutTemplate },
        { href: "/marketing/metrics", label: "Métricas", icon: ChartColumn },
      ],
    },
    {
      href: "/automations",
      label: "Automações",
      icon: Workflow,
      children: [{ href: "/automations", label: "Todas as automações", icon: Workflow }],
    },
    { href: "/tasks", label: "Tarefas", icon: CheckSquare },
    {
      href: "/settings",
      label: "Configurações",
      icon: Settings,
      children: [
        { href: "/settings", label: "Visão geral", icon: LayoutGrid },
        { href: "/settings/security", label: "Segurança", icon: KeyRound },
        ...(isDirector
          ? [{ href: "/settings/users", label: "Usuários", icon: UserCog }]
          : []),
        { href: "/settings/api", label: "API", icon: Braces },
        { href: "/settings/webhooks", label: "Webhooks", icon: Webhook },
      ],
    },
  ];
}

const linkClass =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// O filho-índice compartilha o href do próprio grupo (ex: "/contacts", "/deals"),
// então só acende em match exato — senão acenderia junto das sub-rotas.
const INDEX_CHILD_HREFS = new Set(["/contacts", "/deals", "/settings", "/automations"]);

function isChildActive(pathname: string, href: string) {
  if (INDEX_CHILD_HREFS.has(href)) return pathname === href;
  return isActive(pathname, href);
}

export function SidebarNav({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const navItems = getNavItems(role === "diretor_comercial");

  return (
    <nav className="flex-1 space-y-1 px-3">
      {navItems.map((item) =>
        item.children ? (
          <NavGroup key={item.href} item={item} pathname={pathname} />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={`${linkClass} ${
              isActive(pathname, item.href)
                ? "bg-white/15 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon size={18} strokeWidth={1.5} />
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const groupActive = isActive(pathname, item.href);
  const [open, setOpen] = useState(groupActive);
  const expanded = open || groupActive;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className={`${linkClass} w-full justify-between ${
          groupActive
            ? "text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-3">
          <item.icon size={18} strokeWidth={1.5} />
          {item.label}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="mt-1 space-y-1 border-l border-white/10 pl-3">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`${linkClass} py-1.5 ${
                isChildActive(pathname, child.href)
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <child.icon size={16} strokeWidth={1.5} />
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
