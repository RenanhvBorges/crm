import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Client de service role: ignora RLS e atua como superusuário. Só pode ser
// importado por server actions ("use server") e route handlers — nunca por
// um componente client. Usado para operações que o usuário autenticado não
// tem (e não deve ter) permissão direta via RLS: criar/gerenciar outros
// usuários (profiles.role, ban/unban) e autenticar chamadas de API por chave.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
