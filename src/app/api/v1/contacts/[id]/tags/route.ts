import { withApiAuth, jsonBody, parseBody, throwOnDbError, ApiError } from "@/lib/api/handler";
import { contactTagsSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";

type Params = { id: string };

// Adiciona tags sem reescrever o array inteiro: a RPC resolve a união em um
// único UPDATE, então dois clientes concorrentes (dois fluxos do n8n, p.ex.)
// não apagam a tag um do outro — o que aconteceria via PATCH /contacts/{id}.
export const POST = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(contactTagsSchema, await jsonBody(request));

  const { data, error } = await admin.rpc("add_contact_tags", {
    p_contact_id: params.id,
    p_tags: body.tags,
  });
  throwOnDbError(error);
  if (!data?.length) throw new ApiError("Contato não encontrado.", 404);

  kickAutomationProcessor();
  return Response.json({ data: data[0] });
});
