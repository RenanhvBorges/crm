import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { listUpdateSchema } from "@/lib/api/schemas";
import type { TablesUpdate } from "@/lib/supabase/database.types";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("contact_lists")
    .select("id, name, description, sort_order, created_at")
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Lista não encontrada.");

  const { count } = await admin
    .from("contact_list_members")
    .select("contact_id", { count: "exact", head: true })
    .eq("list_id", params.id);

  return Response.json({ data: { ...data, member_count: count ?? 0 } });
});

export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(listUpdateSchema, await jsonBody(request));

  const updates: TablesUpdate<"contact_lists"> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await admin
    .from("contact_lists")
    .update(updates)
    .eq("id", params.id)
    .select("id, name, description, sort_order, created_at")
    .single();
  throwOnDbError(error, "Lista não encontrada.");
  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { error } = await admin.from("contact_lists").delete().eq("id", params.id);
  throwOnDbError(error, "Lista não encontrada.");
  return deleted();
});
