import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json, Tables, TablesUpdate } from "@/lib/supabase/database.types";
import {
  branchEntry,
  findNode,
  firstNode,
  nextNode,
  parseFlow,
  type FlowNode,
} from "./flow";
import { triggerMatches } from "./triggers";
import { evaluateCondition } from "./conditions";
import { executeNode } from "./actions-exec";
import { fanOutEvent, processWebhookDeliveries } from "@/lib/webhooks/deliver";
import { processAdConversions } from "@/lib/ad-conversions/dispatch";

type Admin = SupabaseClient<Database>;
type Automation = Tables<"automations">;
type Enrollment = Tables<"automation_enrollments">;
type AutomationEvent = Tables<"automation_events">;

const WAIT_UNIT_MS: Record<string, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

// Proteções anti-loop / anti-fuga (ver também o dedupe em tryEnroll):
const MAX_EVENT_AGE_MS = 24 * 3_600_000; // evento mais velho que isso não inscreve
const MAX_ENROLLMENTS_PER_HOUR = 5; // por dupla (automação, contato)
const MAX_STEPS_PER_RUN = 20; // nós avançados por enrollment por chamada
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 5 * 60_000;
const LOCK_EXPIRY_MS = 5 * 60_000;
const MAX_ROUNDS = 3; // rodadas por tick, para dar progresso a automações encadeadas

export type ProcessSummary = {
  events: number;
  enrolled: number;
  advanced: number;
  webhooksQueued: number;
  webhooksSent: number;
  conversionsSent: number;
};

// Processa a fila de automações: consome eventos → inscreve contatos nas
// automações ativas cujo gatilho casa → avança inscrições em execução e
// acorda esperas vencidas → envia webhooks e conversões offline. Chamado pelo
// cron (1 min) e pelo kick pós-mutação.
export async function processAutomations(): Promise<ProcessSummary> {
  const admin = createAdminClient();
  const summary: ProcessSummary = {
    events: 0,
    enrolled: 0,
    advanced: 0,
    webhooksQueued: 0,
    webhooksSent: 0,
    conversionsSent: 0,
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: events, error: claimError } = await admin.rpc("claim_automation_events", {
      p_limit: 100,
    });
    if (claimError) throw new Error(claimError.message);

    const [{ data: actives }, { data: subscriptions }] = await Promise.all([
      admin.from("automations").select("*").eq("status", "active"),
      admin.from("webhook_subscriptions").select("*").eq("is_active", true),
    ]);

    let didWork = false;

    for (const event of events ?? []) {
      summary.events++;
      didWork = true;
      summary.webhooksQueued += await fanOutEvent(admin, event, subscriptions ?? []);
      if (!event.contact_id) continue;
      if (Date.parse(event.created_at) < Date.now() - MAX_EVENT_AGE_MS) continue;
      for (const automation of actives ?? []) {
        if (!triggerMatches(automation, event)) continue;
        if (await tryEnroll(admin, automation, event)) summary.enrolled++;
      }
    }

    const nowIso = new Date().toISOString();
    await admin
      .from("automation_enrollments")
      .update({ status: "running" })
      .eq("status", "waiting")
      .lte("wait_until", nowIso);

    const { data: running } = await admin
      .from("automation_enrollments")
      .select("*")
      .eq("status", "running")
      .limit(200);

    for (const enrollment of running ?? []) {
      const claimed = await claimEnrollment(admin, enrollment.id);
      if (!claimed) continue;
      await advanceEnrollment(admin, claimed);
      summary.advanced++;
      didWork = true;
    }

    if (!didWork) break;
  }

  const deliveries = await processWebhookDeliveries(admin);
  summary.webhooksSent += deliveries.succeeded;

  // Conversões enfileiradas pelo passo "Enviar conversão offline" neste tick
  // (e retentativas vencidas) saem para o Google/Meta aqui.
  const conversions = await processAdConversions(admin);
  summary.conversionsSent += conversions.sent;

  return summary;
}

async function tryEnroll(
  admin: Admin,
  automation: Automation,
  event: AutomationEvent,
): Promise<boolean> {
  const result = await enrollContact(admin, automation, event.contact_id!, {
    eventId: event.id,
    context: event.payload,
  });
  return result.enrolled;
}

export type EnrollResult =
  | { enrolled: true }
  | { enrolled: false; reason: "already_active" | "already_enrolled" | "rate_capped" | "error" };

// Inscreve um contato numa automação aplicando as travas anti-loop. Usado pelo
// consumo de eventos e pelo endpoint de inscrição manual da API.
export async function enrollContact(
  admin: Admin,
  automation: Automation,
  contactId: string,
  options: { eventId?: string | null; context?: Json } = {},
): Promise<EnrollResult> {
  const { data: activeExisting } = await admin
    .from("automation_enrollments")
    .select("id")
    .eq("automation_id", automation.id)
    .eq("contact_id", contactId)
    .in("status", ["running", "waiting"])
    .limit(1);
  if (activeExisting?.length) return { enrolled: false, reason: "already_active" };

  if (!automation.allow_reentry) {
    const { data: anyExisting } = await admin
      .from("automation_enrollments")
      .select("id")
      .eq("automation_id", automation.id)
      .eq("contact_id", contactId)
      .limit(1);
    if (anyExisting?.length) return { enrolled: false, reason: "already_enrolled" };
  }

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recentCount } = await admin
    .from("automation_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", automation.id)
    .eq("contact_id", contactId)
    .gte("created_at", hourAgo);
  if ((recentCount ?? 0) >= MAX_ENROLLMENTS_PER_HOUR) {
    console.warn(
      `[automations] rate cap: contato ${contactId} já entrou ${recentCount}x na automação ${automation.id} na última hora — possível loop.`,
    );
    return { enrolled: false, reason: "rate_capped" };
  }

  const flow = parseFlow(automation.flow);
  const start = firstNode(flow);

  const { error } = await admin.from("automation_enrollments").insert({
    automation_id: automation.id,
    contact_id: contactId,
    event_id: options.eventId ?? null,
    context: options.context ?? {},
    status: start ? "running" : "completed",
    current_node_id: start?.id ?? null,
    completed_at: start ? null : new Date().toISOString(),
  });
  if (error) {
    console.error(`[automations] falha ao inscrever contato ${contactId}:`, error.message);
    return { enrolled: false, reason: "error" };
  }
  return { enrolled: true };
}

// Claim atômico do enrollment: só um tick avança cada inscrição por vez;
// locks de ticks mortos expiram em 5 min.
async function claimEnrollment(admin: Admin, enrollmentId: string): Promise<Enrollment | null> {
  const expiredBefore = new Date(Date.now() - LOCK_EXPIRY_MS).toISOString();
  const { data } = await admin
    .from("automation_enrollments")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", enrollmentId)
    .eq("status", "running")
    .or(`locked_at.is.null,locked_at.lt.${expiredBefore}`)
    .select("*")
    .maybeSingle();
  return data ?? null;
}

type EnrollmentContext = Record<string, unknown> & {
  woke_from?: string;
  retry?: { node_id: string; attempts: number };
};

async function advanceEnrollment(admin: Admin, enrollment: Enrollment): Promise<void> {
  const release = (fields: TablesUpdate<"automation_enrollments"> = {}) =>
    admin
      .from("automation_enrollments")
      .update({ locked_at: null, ...fields })
      .eq("id", enrollment.id);

  const { data: automation } = await admin
    .from("automations")
    .select("*")
    .eq("id", enrollment.automation_id)
    .single();
  if (!automation || automation.status !== "active") {
    // Automação pausada/excluída: congela a inscrição até reativar.
    await release();
    return;
  }

  const flow = parseFlow(automation.flow);
  let contact = await fetchContact(admin, enrollment.contact_id);
  if (!contact) {
    await fail(admin, enrollment, "Contato excluído.");
    return;
  }

  const context: EnrollmentContext = {
    ...((enrollment.context as Record<string, unknown> | null) ?? {}),
  };

  let node: FlowNode | null;
  if (enrollment.current_node_id) {
    node = findNode(flow, enrollment.current_node_id);
    if (!node) {
      await fail(admin, enrollment, "Passo não encontrado — o fluxo foi editado.");
      return;
    }
  } else {
    node = firstNode(flow);
  }

  let steps = 0;
  while (node && steps < MAX_STEPS_PER_RUN) {
    steps++;

    if (node.type === "wait") {
      if (context.woke_from === node.id) {
        // Acabou de acordar desta espera: segue adiante.
        delete context.woke_from;
        node = nextNode(flow, node.id);
        continue;
      }
      const waitUntil = new Date(
        Date.now() + node.amount * (WAIT_UNIT_MS[node.unit] ?? 86_400_000),
      ).toISOString();
      await logStep(admin, enrollment.id, node, "ok", { wait_until: waitUntil });
      await release({
        status: "waiting",
        wait_until: waitUntil,
        current_node_id: node.id,
        context: { ...context, woke_from: node.id } as Json,
      });
      return;
    }

    if (node.type === "condition") {
      // Estado fresco do contato — pode ter mudado durante esperas anteriores.
      contact = (await fetchContact(admin, enrollment.contact_id)) ?? contact;
      const result = await evaluateCondition(admin, node, contact);
      await logStep(admin, enrollment.id, node, "ok", { result });
      node = branchEntry(node, result, flow);
      continue;
    }

    const result = await executeNode(
      admin,
      { ...enrollment, context: context as Json },
      node,
      contact,
      { id: automation.id, name: automation.name },
    );

    if (result.status === "error") {
      const attempts = (context.retry?.node_id === node.id ? context.retry.attempts : 0) + 1;
      await logStep(admin, enrollment.id, node, "error", {
        error: result.error,
        attempt: attempts,
      });
      if (attempts < RETRY_LIMIT) {
        await release({
          status: "waiting",
          wait_until: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
          current_node_id: node.id,
          context: { ...context, retry: { node_id: node.id, attempts } } as Json,
        });
      } else {
        await fail(admin, enrollment, result.error, node.id);
      }
      return;
    }

    delete context.retry;
    await logStep(admin, enrollment.id, node, result.status, result.detail ?? {});
    // A ação pode ter mutado o contato (tags, campos) — recarrega para que os
    // próximos passos não trabalhem com estado obsoleto.
    contact = (await fetchContact(admin, enrollment.contact_id)) ?? contact;
    node = nextNode(flow, node.id);
    await release({ current_node_id: node?.id ?? null, context: context as Json });
    if (node) {
      const reclaimed = await claimEnrollment(admin, enrollment.id);
      if (!reclaimed) return;
    }
  }

  if (!node) {
    await release({
      status: "completed",
      current_node_id: null,
      completed_at: new Date().toISOString(),
      context: context as Json,
    });
  } else {
    await fail(admin, enrollment, "Limite de passos por execução atingido.", node.id);
  }
}

async function fetchContact(admin: Admin, contactId: string) {
  const { data } = await admin.from("contacts").select("*").eq("id", contactId).maybeSingle();
  return data;
}

async function fail(
  admin: Admin,
  enrollment: Enrollment,
  message: string,
  nodeId?: string,
): Promise<void> {
  await admin
    .from("automation_enrollments")
    .update({
      status: "failed",
      error_message: message,
      current_node_id: nodeId ?? enrollment.current_node_id,
      completed_at: new Date().toISOString(),
      locked_at: null,
    })
    .eq("id", enrollment.id);
}

async function logStep(
  admin: Admin,
  enrollmentId: string,
  node: FlowNode,
  status: "ok" | "error" | "skipped",
  detail: Record<string, unknown>,
): Promise<void> {
  await admin.from("automation_step_logs").insert({
    enrollment_id: enrollmentId,
    node_id: node.id,
    node_type: node.type,
    status,
    detail: detail as Json,
  });
}
