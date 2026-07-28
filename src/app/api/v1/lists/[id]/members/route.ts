import { withApiAuth, jsonBody, parseBody, throwOnDbError } from "@/lib/api/handler";
import { getPagination, paginated } from "@/lib/api/pagination";
import { listMembersSchema } from "@/lib/api/schemas";
import { kickAutomationProcessor } from "@/lib/automations/kick";

type Params = { id: string };

export const GET = withApiAuth<Params>(async (_request, { admin, url, params }) => {
  const pagination = getPagination(url);
  const { data, count, error } = await admin
    .from("contact_list_members")
    .select("added_at, contacts(id, name, email, phone, company, tags, score)", { count: "exact" })
    .eq("list_id", params.id)
    .order("added_at", { ascending: false })
    .range(pagination.from, pagination.to);
  throwOnDbError(error);

  const members = (data ?? []).map((m) => ({ ...m.contacts, added_at: m.added_at }));
  return paginated(members, count, pagination);
});

// Adição em lote; contatos já presentes são ignorados (PK composta), então
// "added" conta apenas as inserções efetivas — que são as que geram evento.
export const POST = withApiAuth<Params>(async (request, { admin, params }) => {
  const body = parseBody(listMembersSchema, await jsonBody(request));

  const { data, error } = await admin
    .from("contact_list_members")
    .upsert(
      body.contact_ids.map((contactId) => ({ list_id: params.id, contact_id: contactId })),
      { onConflict: "list_id,contact_id", ignoreDuplicates: true },
    )
    .select("contact_id");
  throwOnDbError(error);

  kickAutomationProcessor();
  return Response.json({ data: { added: data?.length ?? 0 } }, { status: 201 });
});
