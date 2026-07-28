import { withApiAuth, jsonBody, parseBody, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { dealCreateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { Json } from "@/lib/supabase/database.types";

const DEAL_COLUMNS =
  "id, title, value, status, pipeline_id, stage_id, contact_id, expected_close_date, closed_at, custom_fields, created_at, updated_at";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);

  let query = admin.from("deals").select(DEAL_COLUMNS, { count: "exact" });
  for (const [param, column] of [
    ["pipeline_id", "pipeline_id"],
    ["stage_id", "stage_id"],
    ["status", "status"],
    ["contact_id", "contact_id"],
  ] as const) {
    const value = url.searchParams.get(param);
    if (value) query = query.eq(column, value);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});

export const POST = withApiAuth(async (request, { admin }) => {
  const body = parseBody(dealCreateSchema, await jsonBody(request));
  const status = body.status ?? "open";
  const isClosed = status === "won" || status === "lost";

  const { data, error } = await admin
    .from("deals")
    .insert({
      title: body.title,
      pipeline_id: body.pipeline_id,
      stage_id: body.stage_id,
      value: body.value ?? 0,
      contact_id: body.contact_id ?? null,
      status,
      closed_at: isClosed ? new Date().toISOString() : null,
      expected_close_date: body.expected_close_date ?? null,
      custom_fields: (body.custom_fields ?? {}) as Json,
    })
    .select(DEAL_COLUMNS)
    .single();
  throwOnDbError(error);

  kickAutomationProcessor();
  return Response.json({ data }, { status: 201 });
});
