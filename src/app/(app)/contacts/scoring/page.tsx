import { createClient } from "@/lib/supabase/server";
import { ScoringClient } from "./scoring-client";

export default async function LeadScoringPage() {
  const supabase = await createClient();

  const [{ data: rules }, { data: tiers }, { data: fields }, { data: tags }] =
    await Promise.all([
      supabase.from("scoring_rules").select("*").order("sort_order"),
      supabase.from("scoring_tiers").select("*").order("min_score"),
      supabase
        .from("custom_field_definitions")
        .select("*")
        .eq("entity", "contact")
        .order("sort_order"),
      supabase.from("tags").select("id, name, color").order("name"),
    ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl">Lead Scoring</h1>
      <p className="mb-6 text-sm text-fg-3">
        Defina regras que somam (ou subtraem) pontos conforme os dados do
        contato. O score é recalculado automaticamente e classificado em faixas.
      </p>

      <ScoringClient
        rules={rules ?? []}
        tiers={tiers ?? []}
        fieldDefinitions={fields ?? []}
        tags={tags ?? []}
      />
    </div>
  );
}
