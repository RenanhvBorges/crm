import { withApiAuth, jsonBody, parseBody, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { webhookCreateSchema } from "@/lib/api/schemas";
import { generateWebhookSecret } from "@/lib/webhooks/deliver";

const WEBHOOK_COLUMNS = "id, name, url, secret, events, is_active, created_at, updated_at";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("webhook_subscriptions")
    .select(WEBHOOK_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});

// O segredo volta na resposta (uma vez e nas leituras): é single-tenant e o
// consumidor precisa dele para validar a assinatura das entregas.
export const POST = withApiAuth(async (request, { admin }) => {
  const body = parseBody(webhookCreateSchema, await jsonBody(request));

  const { data, error } = await admin
    .from("webhook_subscriptions")
    .insert({
      name: body.name,
      url: body.url,
      events: body.events,
      is_active: body.is_active ?? true,
      secret: generateWebhookSecret(),
    })
    .select(WEBHOOK_COLUMNS)
    .single();
  throwOnDbError(error);
  return Response.json({ data }, { status: 201 });
});
