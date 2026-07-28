import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { dealUpdateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";

const DEAL_COLUMNS =
  "id, title, value, status, pipeline_id, stage_id, contact_id, expected_close_date, closed_at, custom_fields, created_at, updated_at";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Negócio não encontrado.");
  return Response.json({ data });
});

export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(dealUpdateSchema, await jsonBody(request));

  const updates: TablesUpdate<"deals"> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.value !== undefined) updates.value = body.value;
  if (body.pipeline_id !== undefined) updates.pipeline_id = body.pipeline_id;
  if (body.stage_id !== undefined) updates.stage_id = body.stage_id;
  if (body.contact_id !== undefined) updates.contact_id = body.contact_id ?? null;
  if (body.expected_close_date !== undefined) {
    updates.expected_close_date = body.expected_close_date ?? null;
  }
  if (body.custom_fields !== undefined) updates.custom_fields = body.custom_fields as Json;
  if (body.status !== undefined) {
    updates.status = body.status;
    // Ganho/perdido fecham o negócio; reabrir limpa a data de fechamento.
    updates.closed_at =
      body.status === "won" || body.status === "lost" ? new Date().toISOString() : null;
  }

  const { data, error } = await admin
    .from("deals")
    .update(updates)
    .eq("id", params.id)
    .select(DEAL_COLUMNS)
    .single();
  throwOnDbError(error, "Negócio não encontrado.");

  kickAutomationProcessor();
  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin.from("deals").delete().eq("id", params.id);
  throwOnDbError(error, "Negócio não encontrado.");
  return deleted();
});
