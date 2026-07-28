import { withApiAuth, jsonBody, parseBody, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { tagCreateSchema } from "@/lib/api/schemas";

const DEFAULT_COLOR = "#263fa3";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("tags")
    .select("id, name, color, created_at", { count: "exact" })
    .order("name")
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});

export const POST = withApiAuth(async (request, { admin }) => {
  const body = parseBody(tagCreateSchema, await jsonBody(request));
  const { data, error } = await admin
    .from("tags")
    .insert({ name: body.name.trim(), color: body.color ?? DEFAULT_COLOR })
    .select("id, name, color, created_at")
    .single();
  throwOnDbError(error);
  return Response.json({ data }, { status: 201 });
});
