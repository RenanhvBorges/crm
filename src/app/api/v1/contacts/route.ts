import { withApiAuth, jsonBody, parseBody, throwOnDbError, ApiError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { contactUpsertSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";

const CONTACT_COLUMNS =
  "id, name, email, phone, company, tags, custom_fields, score, lead_source, created_at, updated_at";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const search = url.searchParams.get("q");
  const tag = url.searchParams.get("tag");
  const listId = url.searchParams.get("list_id");

  let contactIdsInList: string[] | null = null;
  if (listId) {
    const { data: members } = await admin
      .from("contact_list_members")
      .select("contact_id")
      .eq("list_id", listId);
    contactIdsInList = (members ?? []).map((m) => m.contact_id);
    if (!contactIdsInList.length) return paginated([], 0, pagination);
  }

  let query = admin.from("contacts").select(CONTACT_COLUMNS, { count: "exact" });
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  }
  if (tag) query = query.contains("tags", [tag]);
  if (contactIdsInList) query = query.in("id", contactIdsInList);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);

  return paginated(data ?? [], count, pagination);
});

// POST /contacts?upsert=email atualiza o contato existente com aquele e-mail
// (merge parcial) em vez de criar um duplicado — o caminho usado por
// integrações que recebem o mesmo lead mais de uma vez. Tags somam (união) e
// custom_fields mesclam por chave; `remove_tags` tira tags do contato existente.
export const POST = withApiAuth(async (request, { admin, url }) => {
  const body = parseBody(contactUpsertSchema, await jsonBody(request));
  const upsertByEmail = url.searchParams.get("upsert") === "email";

  const values = {
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    tags: body.tags ?? [],
    custom_fields: (body.custom_fields ?? {}) as Json,
  };

  if (upsertByEmail) {
    if (!values.email) {
      throw new ApiError("O campo 'email' é obrigatório para upsert por e-mail.", 422);
    }
    const { data: existing } = await admin
      .from("contacts")
      .select("id, custom_fields, tags")
      .eq("email", values.email)
      .maybeSingle();

    if (existing) {
      const mergedCustom = {
        ...((existing.custom_fields as Record<string, unknown> | null) ?? {}),
        ...(body.custom_fields ?? {}),
      } as Json;
      const removed = new Set(body.remove_tags ?? []);
      const mergedTags = (
        body.tags ? [...new Set([...existing.tags, ...body.tags])] : existing.tags
      ).filter((tag) => !removed.has(tag));

      // Merge parcial: telefone e empresa só mudam se vierem no corpo (antes, um
      // envio sem `company` apagava a empresa do contato existente).
      const updates: TablesUpdate<"contacts"> = {
        name: values.name,
        tags: mergedTags,
        custom_fields: mergedCustom,
      };
      if (body.phone !== undefined) updates.phone = values.phone;
      if (body.company !== undefined) updates.company = values.company;

      const { data, error } = await admin
        .from("contacts")
        .update(updates)
        .eq("id", existing.id)
        .select(CONTACT_COLUMNS)
        .single();
      throwOnDbError(error);
      kickAutomationProcessor();
      return Response.json({ data });
    }
  }

  const { data, error } = await admin
    .from("contacts")
    .insert(values)
    .select(CONTACT_COLUMNS)
    .single();
  throwOnDbError(error);

  kickAutomationProcessor();
  return Response.json({ data }, { status: 201 });
});
