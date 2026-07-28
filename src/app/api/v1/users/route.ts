import { withApiAuth, throwOnDbError } from "@/lib/api/handler";

// Somente leitura: usuários nascem do Supabase Auth (Configurações → Usuários).
// Existe para integrações resolverem o `assigned_to` de tarefas.
export const GET = withApiAuth(async (_request, { admin }) => {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");
  throwOnDbError(error);
  return Response.json({ data });
});
