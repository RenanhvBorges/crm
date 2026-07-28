import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { webhookUpdateSchema } from "@/lib/api/schemas";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const WEBHOOK_COLUMNS = "id, name, url, secret, events, is_active, created_at, updated_at";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("webhook_subscriptions")
    .select(WEBHOOK_COLUMNS)
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Webhook não encontrado.");
  return Response.json({ data });
});

export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(webhookUpdateSchema, await jsonBody(request));

  const updates: TablesUpdate<"webhook_subscriptions"> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.url !== undefined) updates.url = body.url;
  if (body.events !== undefined) updates.events = body.events;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await admin
    .from("webhook_subscriptions")
    .update(updates)
    .eq("id", params.id)
    .select(WEBHOOK_COLUMNS)
    .single();
  throwOnDbError(error, "Webhook não encontrado.");
  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin.from("webhook_subscriptions").delete().eq("id", params.id);
  throwOnDbError(error, "Webhook não encontrado.");
  return deleted();
});
