import { withApiAuth, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";

// Somente leitura: templates são editados no builder de e-mail da UI.
export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("email_templates")
    .select("id, name, subject, created_at, updated_at", { count: "exact" })
    .order("name")
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});
