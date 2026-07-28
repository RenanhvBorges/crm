import { withApiAuth, throwOnDbError } from "@/lib/api/handler";

// Funis com estágios aninhados: são poucos registros e sempre consumidos
// juntos (para montar seletores), então não há paginação aqui.
export const GET = withApiAuth(async (_request, { admin }) => {
  const [{ data: pipelines, error }, { data: stages, error: stagesError }] = await Promise.all([
    admin.from("pipelines").select("id, name, is_default, sort_order, created_at").order("sort_order"),
    admin
      .from("pipeline_stages")
      .select("id, pipeline_id, name, color, sort_order")
      .order("sort_order"),
  ]);
  throwOnDbError(error);
  throwOnDbError(stagesError);

  const data = (pipelines ?? []).map((p) => ({
    ...p,
    stages: (stages ?? []).filter((s) => s.pipeline_id === p.id),
  }));

  return Response.json({ data });
});
