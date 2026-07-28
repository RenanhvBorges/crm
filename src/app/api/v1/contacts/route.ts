import { withApiAuth, jsonBody, parseBody, throwOnDbError, ApiError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { contactCreateSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";
import type { Json } from "@/lib/supabase/database.types";

const CONTACT_COLUMNS =
  "id, name, email, phone, company, tags, custom_fields, score, created_at, updated_at";

export const GET = withApiAuth(async (_request, { admin, url }) => {
  const pagination = getPagination(url);
  const search = url.searchParams.get("q");
  const email = url.searchParams.get("email");
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
  // ?email é match exato (≠ ?q, que é busca parcial): é como uma integração
  // decide entre criar um contato novo ou atualizar o existente.
  if (email) query = query.eq("email", email);
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
// integrações que recebem o mesmo lead mais de uma vez.
export const POST = withApiAuth(async (request, { admin, url }) => {
  const body = parseBody(contactCreateSchema, await jsonBody(request));
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
      const mergedTags = body.tags
        ? [...new Set([...existing.tags, ...body.tags])]
        : existing.tags;

      const { data, error } = await admin
        .from("contacts")
        .update({ ...values, tags: mergedTags, custom_fields: mergedCustom })
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
