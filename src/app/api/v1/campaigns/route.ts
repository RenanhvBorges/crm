import { withApiAuth, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";

// Somente leitura, e sem as campanhas de sistema criadas pelas automações
// (uma por e-mail enviado — ruído para quem consome a API).
export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("email_campaigns")
    .select("id, name, subject, status, scheduled_at, sent_at, created_at", { count: "exact" })
    .eq("is_system", false)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});
