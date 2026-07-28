import { withApiAuth, jsonBody, parseBody, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { taskCreateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";

const TASK_COLUMNS =
  "id, title, description, status, due_date, completed_at, contact_id, deal_id, assigned_to, created_at";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);

  let query = admin.from("tasks").select(TASK_COLUMNS, { count: "exact" });
  for (const param of ["status", "contact_id", "deal_id", "assigned_to"] as const) {
    const value = url.searchParams.get(param);
    if (value) query = query.eq(param, value);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});

export const POST = withApiAuth(async (request, { admin }) => {
  const body = parseBody(taskCreateSchema, await jsonBody(request));
  const status = body.status ?? "pending";

  const { data, error } = await admin
    .from("tasks")
    .insert({
      title: body.title,
      description: body.description ?? null,
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      due_date: body.due_date ?? null,
      contact_id: body.contact_id ?? null,
      deal_id: body.deal_id ?? null,
      assigned_to: body.assigned_to ?? null,
    })
    .select(TASK_COLUMNS)
    .single();
  throwOnDbError(error);

  kickAutomationProcessor();
  return Response.json({ data }, { status: 201 });
});
