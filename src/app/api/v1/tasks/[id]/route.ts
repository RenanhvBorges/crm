import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { taskUpdateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const TASK_COLUMNS =
  "id, title, description, status, due_date, completed_at, contact_id, deal_id, assigned_to, created_at";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Tarefa não encontrada.");
  return Response.json({ data });
});

export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(taskUpdateSchema, await jsonBody(request));

  const updates: TablesUpdate<"tasks"> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.due_date !== undefined) updates.due_date = body.due_date ?? null;
  if (body.contact_id !== undefined) updates.contact_id = body.contact_id ?? null;
  if (body.deal_id !== undefined) updates.deal_id = body.deal_id ?? null;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to ?? null;
  if (body.status !== undefined) {
    updates.status = body.status;
    updates.completed_at = body.status === "done" ? new Date().toISOString() : null;
  }

  const { data, error } = await admin
    .from("tasks")
    .update(updates)
    .eq("id", params.id)
    .select(TASK_COLUMNS)
    .single();
  throwOnDbError(error, "Tarefa não encontrada.");

  kickAutomationProcessor();
  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin.from("tasks").delete().eq("id", params.id);
  throwOnDbError(error, "Tarefa não encontrada.");
  return deleted();
});
