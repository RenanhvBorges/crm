import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { ConditionNode, ConditionRule } from "./flow";

type Admin = SupabaseClient<Database>;
type Contact = Tables<"contacts">;

// Avalia um nó Se/Senão contra o estado ATUAL do contato (recarregado pelo
// engine antes da chamada) — semântica correta após passos de espera.
export async function evaluateCondition(
  admin: Admin,
  node: ConditionNode,
  contact: Contact,
): Promise<boolean> {
  if (node.rules.length === 0) return true;

  const results = await Promise.all(node.rules.map((rule) => evaluateRule(admin, rule, contact)));
  return node.match === "all" ? results.every(Boolean) : results.some(Boolean);
}

async function evaluateRule(admin: Admin, rule: ConditionRule, contact: Contact): Promise<boolean> {
  switch (rule.source) {
    case "tag": {
      const has = contact.tags.includes(rule.value);
      return rule.operator === "not_has_tag" ? !has : has;
    }
    case "score": {
      const target = Number(rule.value);
      if (!Number.isFinite(target)) return false;
      if (rule.operator === "gt") return contact.score > target;
      if (rule.operator === "lt") return contact.score < target;
      return contact.score === target;
    }
    case "list": {
      const { data } = await admin
        .from("contact_list_members")
        .select("contact_id")
        .eq("list_id", rule.value)
        .eq("contact_id", contact.id)
        .maybeSingle();
      const inList = Boolean(data);
      return rule.operator === "not_in_list" ? !inList : inList;
    }
    case "fixed": {
      const raw = (contact as unknown as Record<string, unknown>)[rule.key];
      return compareValue(raw, rule);
    }
    case "custom": {
      const customValues = (contact.custom_fields as Record<string, unknown> | null) ?? {};
      return compareValue(customValues[rule.key], rule);
    }
  }
}

function compareValue(raw: unknown, rule: ConditionRule): boolean {
  const isEmpty =
    raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0);

  switch (rule.operator) {
    case "is_filled":
      return !isEmpty;
    case "not_filled":
      return isEmpty;
    case "equals":
      return String(raw ?? "").toLowerCase() === rule.value.toLowerCase();
    case "not_equals":
      return String(raw ?? "").toLowerCase() !== rule.value.toLowerCase();
    case "contains":
      return String(raw ?? "")
        .toLowerCase()
        .includes(rule.value.toLowerCase());
    case "gt": {
      const n = Number(raw);
      const target = Number(rule.value);
      return Number.isFinite(n) && Number.isFinite(target) && n > target;
    }
    case "lt": {
      const n = Number(raw);
      const target = Number(rule.value);
      return Number.isFinite(n) && Number.isFinite(target) && n < target;
    }
    default:
      return false;
  }
}
