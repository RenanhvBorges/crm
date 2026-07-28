import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { contactUpdateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";

const CONTACT_COLUMNS =
  "id, name, email, phone, company, tags, custom_fields, score, created_at, updated_at";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Contato não encontrado.");
  return Response.json({ data });
});

export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(contactUpdateSchema, await jsonBody(request));

  const updates: TablesUpdate<"contacts"> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email ?? null;
  if (body.phone !== undefined) updates.phone = body.phone ?? null;
  if (body.company !== undefined) updates.company = body.company ?? null;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.custom_fields !== undefined) updates.custom_fields = body.custom_fields as Json;

  const { data, error } = await admin
    .from("contacts")
    .update(updates)
    .eq("id", params.id)
    .select(CONTACT_COLUMNS)
    .single();
  throwOnDbError(error, "Contato não encontrado.");

  kickAutomationProcessor();
  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin.from("contacts").delete().eq("id", params.id);
  throwOnDbError(error, "Contato não encontrado.");
  return deleted();
});
