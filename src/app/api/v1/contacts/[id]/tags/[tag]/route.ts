import { withApiAuth, throwOnDbError, ApiError } from "@/lib/api/handler";
import { kickAutomationProcessor } from "@/lib/automations/kick";

type Params = { id: string; tag: string };

// O nome da tag vem no path e pode ter espaço/acento — o Next já entrega
// decodificado, mas a decodificação é idempotente para nomes simples.
export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin.rpc("remove_contact_tags", {
    p_contact_id: params.id,
    p_tags: [params.tag],
  });
  throwOnDbError(error);
  if (!data?.length) throw new ApiError("Contato não encontrado.", 404);

  kickAutomationProcessor();
  return Response.json({ data: data[0] });
});
