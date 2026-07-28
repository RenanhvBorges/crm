import { withApiAuth, jsonBody, parseBody, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { listCreateSchema } from "@/lib/api/schemas";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("contact_lists")
    .select("id, name, description, sort_order, created_at", { count: "exact" })
    .order("sort_order")
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});

export const POST = withApiAuth(async (request, { admin }) => {
  const body = parseBody(listCreateSchema, await jsonBody(request));

  let sortOrder = body.sort_order;
  if (sortOrder === undefined) {
    const { count } = await admin
      .from("contact_lists")
      .select("id", { count: "exact", head: true });
    sortOrder = count ?? 0;
  }

  const { data, error } = await admin
    .from("contact_lists")
    .insert({
      name: body.name.trim(),
      description: body.description ?? null,
      sort_order: sortOrder,
    })
    .select("id, name, description, sort_order, created_at")
    .single();
  throwOnDbError(error);
  return Response.json({ data }, { status: 201 });
});
