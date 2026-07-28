import { withApiAuth, jsonBody, parseBody, throwOnDbError, ApiError } from "@/lib/api/handler";
import { enrollSchema } from "@/lib/api/schemas";
import { enrollContact } from "@/lib/automations/engine";
import { kickAutomationProcessor } from "@/lib/automations/kick";

type Params = { id: string };

const REASON_MESSAGE: Record<string, string> = {
  already_active: "O contato já está em execução nesta automação.",
  already_enrolled:
    "O contato já passou por esta automação (habilite a reentrada para permitir de novo).",
  rate_capped: "O contato entrou nesta automação vezes demais na última hora.",
  error: "Não foi possível inscrever o contato.",
};

// Inscrição manual: o caminho para o n8n colocar um contato numa automação
// sem depender de um evento do CRM (útil com o gatilho "Inscrição via API").
export const POST = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(enrollSchema, await jsonBody(request));

  const { data: automation, error } = await admin
    .from("automations")
    .select("*")
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Automação não encontrada.");
  if (automation!.status !== "active") {
    throw new ApiError("A automação precisa estar ativa para receber inscrições.", 409);
  }

  let contactId = body.contact_id ?? null;
  if (!contactId && body.email) {
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();
    if (!contact) throw new ApiError("Nenhum contato com esse e-mail.", 404);
    contactId = contact.id;
  }

  const result = await enrollContact(admin, automation!, contactId!, {
    context: { source: "api" },
  });
  if (!result.enrolled) {
    throw new ApiError(REASON_MESSAGE[result.reason] ?? REASON_MESSAGE.error, 409);
  }

  kickAutomationProcessor();
  return Response.json({ data: { enrolled: true, contact_id: contactId } }, { status: 201 });
});
