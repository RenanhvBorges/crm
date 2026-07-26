import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiKey } from "@/lib/api-keys";
import type { Json } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return Response.json({ error: "Chave de API ausente, inválida ou revogada." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .select("id, name, email, phone, company, tags, custom_fields, score, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

export async function POST(request: Request) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return Response.json({ error: "Chave de API ausente, inválida ou revogada." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "O campo 'name' é obrigatório." }, { status: 422 });
  }

  const email = typeof body.email === "string" ? body.email : null;
  const phone = typeof body.phone === "string" ? body.phone : null;
  const company = typeof body.company === "string" ? body.company : null;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string") : [];
  const customFields: Json =
    typeof body.custom_fields === "object" && body.custom_fields !== null
      ? (body.custom_fields as Json)
      : {};

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .insert({
      name,
      email,
      phone,
      company,
      tags,
      custom_fields: customFields,
    })
    .select("id, name, email, phone, company, tags, custom_fields, score, created_at, updated_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
