"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import {
  NO_VALUE_OPERATORS,
  TAG_OPERATORS,
  type FieldSource,
  type ScoringOperator,
} from "@/lib/scoring";

const DEFAULT_TIER_COLOR = "#94a3b8";

// Regras alteram o score armazenado -> recalcula todos os contatos.
async function revalidateAfterRuleChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { error } = await supabase.rpc("recalculate_all_contact_scores");
  if (error) throw new Error(error.message);
  kickAutomationProcessor();
  revalidatePath("/contacts/scoring");
  revalidatePath("/contacts");
}

function parseRuleFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const field_source = String(formData.get("field_source") ?? "") as FieldSource;
  const operator = String(formData.get("operator") ?? "") as ScoringOperator;
  const rawKey = String(formData.get("field_key") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "").trim();
  const points = Number.parseInt(String(formData.get("points") ?? "0"), 10);

  if (!name) throw new Error("Dê um nome para a regra.");
  if (!["fixed", "custom", "tag"].includes(field_source)) {
    throw new Error("Fonte da regra inválida.");
  }
  if (!operator) throw new Error("Escolha um operador.");
  if (Number.isNaN(points)) throw new Error("Pontos deve ser um número inteiro.");

  const isTag = field_source === "tag";
  const field_key = isTag ? null : rawKey || null;
  if (!isTag && !field_key) throw new Error("Escolha o campo da regra.");

  // Valor: obrigatório exceto em operadores sem valor. Tag sempre exige valor.
  const needsValue =
    isTag || !NO_VALUE_OPERATORS.includes(operator);
  const value = needsValue ? rawValue : null;
  if (needsValue && !value) {
    throw new Error("Informe o valor de comparação da regra.");
  }
  if (isTag && !TAG_OPERATORS.includes(operator)) {
    throw new Error("Operador inválido para tag.");
  }

  return { name, field_source, field_key, operator, value, points };
}

export async function createRule(formData: FormData) {
  const supabase = await createClient();
  const values = parseRuleFormData(formData);

  const { count } = await supabase
    .from("scoring_rules")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase
    .from("scoring_rules")
    .insert({ ...values, sort_order: count ?? 0 });

  if (error) throw new Error(error.message);
  await revalidateAfterRuleChange(supabase);
}

export async function deleteRule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("scoring_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await revalidateAfterRuleChange(supabase);
}

export async function setRuleActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scoring_rules")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await revalidateAfterRuleChange(supabase);
}

// --- Faixas (tiers): só mudam a exibição, não o score armazenado ---

export async function createTier(formData: FormData) {
  const supabase = await createClient();
  const label = String(formData.get("label") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_TIER_COLOR;
  const min_score = Number.parseInt(String(formData.get("min_score") ?? "0"), 10);

  if (!label) throw new Error("Dê um nome para a faixa.");
  if (Number.isNaN(min_score)) throw new Error("Pontuação mínima inválida.");

  const { count } = await supabase
    .from("scoring_tiers")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase
    .from("scoring_tiers")
    .insert({ label, color, min_score, sort_order: count ?? 0 });

  if (error) throw new Error(error.message);
  revalidatePath("/contacts/scoring");
  revalidatePath("/contacts");
}

export async function updateTier(id: string, formData: FormData) {
  const supabase = await createClient();
  const label = String(formData.get("label") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_TIER_COLOR;
  const min_score = Number.parseInt(String(formData.get("min_score") ?? "0"), 10);

  if (!label) throw new Error("Dê um nome para a faixa.");
  if (Number.isNaN(min_score)) throw new Error("Pontuação mínima inválida.");

  const { error } = await supabase
    .from("scoring_tiers")
    .update({ label, color, min_score })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/contacts/scoring");
  revalidatePath("/contacts");
}

export async function deleteTier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("scoring_tiers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts/scoring");
  revalidatePath("/contacts");
}
