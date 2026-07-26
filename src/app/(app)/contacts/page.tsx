import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/contacts-table";
import { saveViewPreferences } from "./view-actions";
import {
  availableColumns,
  DEFAULT_VISIBLE_COLUMNS,
  type ContactRow,
  type ViewConfig,
} from "@/lib/contact-columns";

const VIEW_KEY = "all_contacts";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("id, name, email, phone, company, tags, score, custom_fields")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`,
    );
  }

  const [{ data: contacts }, { data: fieldDefs }, { data: tiers }, { data: pref }] =
    await Promise.all([
      query,
      supabase
        .from("custom_field_definitions")
        .select("key, label, field_type")
        .eq("entity", "contact")
        .order("sort_order"),
      supabase.from("scoring_tiers").select("*").order("min_score"),
      supabase
        .from("contact_view_preferences")
        .select("config")
        .eq("view_key", VIEW_KEY)
        .maybeSingle(),
    ]);

  const allColumns = availableColumns(fieldDefs ?? []);
  const rows: ContactRow[] = (contacts ?? []).map((c) => ({
    ...c,
    custom_fields: (c.custom_fields ?? {}) as Record<string, unknown>,
  }));
  const initialConfig =
    (pref?.config as ViewConfig | null) ?? {
      columns: DEFAULT_VISIBLE_COLUMNS,
      filters: [],
    };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Contatos</h1>
        <Link
          href="/contacts/new"
          className="flex items-center gap-2 rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          <Plus size={16} strokeWidth={1.5} />
          Novo contato
        </Link>
      </div>

      <form className="mb-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, e-mail ou empresa..."
            className="w-full rounded-md border border-border-1 bg-oxford-white py-2 pl-9 pr-3 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>
      </form>

      <ContactsTable
        viewKey={VIEW_KEY}
        contacts={rows}
        allColumns={allColumns}
        tiers={tiers ?? []}
        initialConfig={initialConfig}
        saveAction={saveViewPreferences}
      />
    </div>
  );
}
