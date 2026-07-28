import { withApiAuth, jsonBody, parseBody, throwOnDbError, ApiError } from "@/lib/api/handler";
import { automationUpdateSchema } from "@/lib/api/schemas";
import { validateFlow, parseFlow } from "@/lib/automations/flow";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const AUTOMATION_COLUMNS =
  "id, name, status, trigger_type, trigger_config, allow_reentry, flow, created_at, updated_at";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("automations")
    .select(AUTOMATION_COLUMNS)
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Automação não encontrada.");
  return Response.json({ data });
});

// O `flow` não é editável por aqui de propósito: montá-lo é trabalho do
// builder. A API mexe no que faz sentido automatizar — ligar, pausar,
// renomear e liberar reentrada.
export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(automationUpdateSchema, await jsonBody(request));

  const { data: current, error: fetchError } = await admin
    .from("automations")
    .select("flow")
    .eq("id", params.id)
    .single();
  throwOnDbError(fetchError, "Automação não encontrada.");

  // Mesma trava da UI: só ativa se o fluxo estiver íntegro.
  if (body.status === "active") {
    const problems = validateFlow(parseFlow(current!.flow));
    if (problems.length) {
      throw new ApiError(`A automação não pode ser ativada: ${problems.join(" ")}`, 409);
    }
  }

  const updates: TablesUpdate<"automations"> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.status !== undefined) updates.status = body.status;
  if (body.allow_reentry !== undefined) updates.allow_reentry = body.allow_reentry;

  const { data, error } = await admin
    .from("automations")
    .update(updates)
    .eq("id", params.id)
    .select(AUTOMATION_COLUMNS)
    .single();
  throwOnDbError(error, "Automação não encontrada.");

  if (body.status === "active") kickAutomationProcessor();
  return Response.json({ data });
});
