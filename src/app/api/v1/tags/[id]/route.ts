import { withApiAuth, jsonBody, parseBody, throwOnDbError, deleted } from "@/lib/api/handler";
import { tagUpdateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data, error } = await admin
    .from("tags")
    .select("id, name, color, created_at")
    .eq("id", params.id)
    .single();
  throwOnDbError(error, "Tag não encontrada.");
  return Response.json({ data });
});

// Renomear/excluir no catálogo propaga para contacts.tags via RPC, igual à UI.
export const PATCH = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(tagUpdateSchema, await jsonBody(request));

  const { data: current, error: fetchError } = await admin
    .from("tags")
    .select("name")
    .eq("id", params.id)
    .single();
  throwOnDbError(fetchError, "Tag não encontrada.");

  const name = body.name?.trim();
  const { data, error } = await admin
    .from("tags")
    .update({ ...(name ? { name } : {}), ...(body.color ? { color: body.color } : {}) })
    .eq("id", params.id)
    .select("id, name, color, created_at")
    .single();
  throwOnDbError(error, "Tag não encontrada.");

  if (name && current && current.name !== name) {
    const { error: syncError } = await admin.rpc("rename_contact_tag", {
      old_name: current.name,
      new_name: name,
    });
    throwOnDbError(syncError);
    kickAutomationProcessor();
  }

  return Response.json({ data });
});

export const DELETE = withApiAuth<Params>(async (_request, { admin, params }) => {
  const { data: current, error: fetchError } = await admin
    .from("tags")
    .select("name")
    .eq("id", params.id)
    .single();
  throwOnDbError(fetchError, "Tag não encontrada.");

  const { error } = await admin.from("tags").delete().eq("id", params.id);
  throwOnDbError(error, "Tag não encontrada.");

  const { error: syncError } = await admin.rpc("remove_contact_tag", {
    tag_name: current!.name,
  });
  throwOnDbError(syncError);

  kickAutomationProcessor();
  return deleted();
});
