import Link from "next/link";
import { Building2, ExternalLink, Mail, Phone } from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";
import type { ScoringTier } from "@/lib/scoring";
import type { Tables } from "@/lib/supabase/database.types";
import type { CustomFieldDefinition, CustomFieldValues } from "@/lib/custom-fields";
import { DEAL_STATUS_BADGE, DEAL_STATUS_LABEL, isDealStatus } from "@/lib/deals";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const FALLBACK_TAG_COLOR = "#263fa3";

export type ContactOtherDeal = { id: string; title: string; value: number; status: string };

type FieldDisplay = { text: string; href?: string };

// "2026-03-05" -> "05/03/2026", sem passar por Date (evita deslocar o dia por fuso).
function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function displayField(
  def: CustomFieldDefinition,
  value: CustomFieldValues[string] | undefined,
): FieldDisplay | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  const options = (def.options as { value: string; label: string }[] | null) ?? [];
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  switch (def.field_type) {
    case "boolean":
      return { text: value ? "Sim" : "Não" };
    case "number":
      return { text: typeof value === "number" ? value.toLocaleString("pt-BR") : String(value) };
    case "date":
      return { text: formatDate(String(value)) };
    case "select":
      return { text: labelOf(String(value)) };
    case "multiselect":
      return { text: (Array.isArray(value) ? value : [String(value)]).map(labelOf).join(", ") };
    case "url": {
      const url = String(value);
      return { text: url, href: /^https?:\/\//i.test(url) ? url : `https://${url}` };
    }
    case "email":
      return { text: String(value), href: `mailto:${value}` };
    case "phone":
      return { text: String(value), href: `tel:${value}` };
    default:
      return { text: Array.isArray(value) ? value.join(", ") : String(value) };
  }
}

export function DealContactCard({
  contact,
  fieldDefinitions,
  tagCatalog,
  tiers,
  otherDeals,
}: {
  contact: Tables<"contacts"> | null;
  fieldDefinitions: CustomFieldDefinition[];
  tagCatalog: { name: string; color: string }[];
  tiers: ScoringTier[];
  otherDeals: ContactOtherDeal[];
}) {
  if (!contact) {
    return (
      <section className="rounded-lg border border-border-1 bg-oxford-white p-5">
        <h2 className="mb-2 text-lg">Contato</h2>
        <p className="text-sm text-fg-muted">
          Nenhum contato vinculado. Escolha um no campo &ldquo;Contato&rdquo; do formulário e salve.
        </p>
      </section>
    );
  }

  const values = (contact.custom_fields ?? {}) as CustomFieldValues;
  const fields = fieldDefinitions
    .map((def) => ({ def, display: displayField(def, values[def.key]) }))
    .filter((f): f is { def: CustomFieldDefinition; display: FieldDisplay } => f.display !== null);

  const colorOf = (name: string) =>
    tagCatalog.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color ??
    FALLBACK_TAG_COLOR;

  return (
    <section className="rounded-lg border border-border-1 bg-oxford-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg">Contato</h2>
        <Link
          href={`/contacts/${contact.id}`}
          className="inline-flex items-center gap-1 text-xs text-fg-brand hover:underline"
        >
          Abrir contato
          <ExternalLink size={12} strokeWidth={1.5} />
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/contacts/${contact.id}`}
          className="text-base font-medium text-fg-1 hover:underline"
        >
          {contact.name}
        </Link>
        <ScoreBadge score={contact.score} tiers={tiers} />
      </div>

      <ul className="space-y-1.5 text-sm text-fg-2">
        {contact.email ? (
          <li className="flex items-center gap-2">
            <Mail size={14} strokeWidth={1.5} className="shrink-0 text-fg-3" />
            <a href={`mailto:${contact.email}`} className="break-all hover:underline">
              {contact.email}
            </a>
          </li>
        ) : null}
        {contact.phone ? (
          <li className="flex items-center gap-2">
            <Phone size={14} strokeWidth={1.5} className="shrink-0 text-fg-3" />
            <a href={`tel:${contact.phone}`} className="hover:underline">
              {contact.phone}
            </a>
          </li>
        ) : null}
        {contact.company ? (
          <li className="flex items-center gap-2">
            <Building2 size={14} strokeWidth={1.5} className="shrink-0 text-fg-3" />
            {contact.company}
          </li>
        ) : null}
        {!contact.email && !contact.phone && !contact.company ? (
          <li className="text-fg-muted">Sem e-mail, telefone ou empresa cadastrados.</li>
        ) : null}
      </ul>

      {contact.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: colorOf(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {fields.length ? (
        <dl className="mt-4 space-y-2 border-t border-border-1 pt-3 text-sm">
          {fields.map(({ def, display }) => (
            <div key={def.id}>
              <dt className="text-xs text-fg-3">{def.label}</dt>
              <dd className="break-words text-fg-1">
                {display.href ? (
                  <a
                    href={display.href}
                    target={display.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-fg-brand hover:underline"
                  >
                    {display.text}
                  </a>
                ) : (
                  display.text
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {otherDeals.length ? (
        <div className="mt-4 border-t border-border-1 pt-3">
          <h3 className="mb-2 text-xs font-medium text-fg-3">Outros negócios deste contato</h3>
          <ul className="space-y-1.5">
            {otherDeals.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/deals/${d.id}`} className="truncate text-fg-brand hover:underline">
                  {d.title}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-fg-accent">{currency.format(d.value)}</span>
                  {isDealStatus(d.status) ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${DEAL_STATUS_BADGE[d.status]}`}
                    >
                      {DEAL_STATUS_LABEL[d.status]}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
