import { withApiAuth, jsonBody, parseBody, throwOnDbError, ApiError } from "@/lib/api/handler";
import { customFieldCreateSchema } from "@/lib/api/schemas";
import type { Json } from "@/lib/supabase/database.types";

const FIELD_COLUMNS =
  "id, entity, key, label, field_type, is_required, options, group_id, sort_order, created_at";

// A key é única por entidade, então entity é obrigatório na leitura para não
// misturar campos de contato e de negócio.
export const GET = withApiAuth(async (_request, { admin, url }) => {
  const entity = url.searchParams.get("entity");
  if (entity !== "contact" && entity !== "deal") {
    throw new ApiError("Informe o parâmetro 'entity' (contact ou deal).", 422);
  }

  const { data, error } = await admin
    .from("custom_field_definitions")
    .select(FIELD_COLUMNS)
    .eq("entity", entity)
    .order("sort_order");
  throwOnDbError(error);
  return Response.json({ data });
});

export const POST = withApiAuth(async (request, { admin }) => {
  const body = parseBody(customFieldCreateSchema, await jsonBody(request));

  const { data, error } = await admin
    .from("custom_field_definitions")
    .insert({
      entity: body.entity,
      key: body.key,
      label: body.label,
      field_type: body.field_type,
      is_required: body.is_required ?? false,
      options: (body.options ?? null) as Json,
      group_id: body.group_id ?? null,
      sort_order: body.sort_order ?? 0,
    })
    .select(FIELD_COLUMNS)
    .single();
  throwOnDbError(error);
  return Response.json({ data }, { status: 201 });
});
