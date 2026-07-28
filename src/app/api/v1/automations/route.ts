import { withApiAuth, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("automations")
    .select("id, name, status, trigger_type, trigger_config, allow_reentry, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);
  return paginated(data ?? [], count, pagination);
});
