import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { customFieldUpdateSchema } from "@/lib/api/schemas";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";

const FIELD_COLUMNS =
  "id, entity, key, label, field_type, is_required, options, group_id, sort_order, created_at";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("custom_field_definitions")
    .select(FIELD_COLUMNS)
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Campo personalizado não encontrado.");
  return Response.json({ data });
});

// `entity` fica de fora do update: mudar a entidade de um campo já preenchido
// órfanaria os valores gravados em contacts/deals.custom_fields.
export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(customFieldUpdateSchema, await jsonBody(request));

  const updates: TablesUpdate<"custom_field_definitions"> = {};
  if (body.key !== undefined) updates.key = body.key;
  if (body.label !== undefined) updates.label = body.label;
  if (body.field_type !== undefined) updates.field_type = body.field_type;
  if (body.is_required !== undefined) updates.is_required = body.is_required;
  if (body.options !== undefined) updates.options = (body.options ?? null) as Json;
  if (body.group_id !== undefined) updates.group_id = body.group_id ?? null;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await admin
    .from("custom_field_definitions")
    .update(updates)
    .eq("id", params.id)
    .select(FIELD_COLUMNS)
    .single();
  throwOnDbError(error, "Campo personalizado não encontrado.");
  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin.from("custom_field_definitions").delete().eq("id", params.id);
  throwOnDbError(error, "Campo personalizado não encontrado.");
  return deleted();
});
