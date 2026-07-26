import "server-only";
import { randomBytes, createHash } from "crypto";
import { createAdminClient } from "./supabase/admin";

const TOKEN_PREFIX = "oxk_";

export function generateApiKey() {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const keyPrefix = token.slice(0, 12);
  const keyHash = hashApiKey(token);
  return { token, keyPrefix, keyHash };
}

export function hashApiKey(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Autentica uma requisição da API v1 pelo header "Authorization: Bearer <chave>".
// Não há sessão de cookies numa chamada de API externa, então a busca por
// key_hash usa o client de service role (ignora RLS). Retorna o id do dono da
// chave, ou null se o header estiver ausente, a chave não existir ou estiver
// revogada.
export async function authenticateApiKey(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  const admin = createAdminClient();
  const { data: key } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hashApiKey(token))
    .maybeSingle();

  if (!key || key.revoked_at) {
    return null;
  }

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  return key.user_id;
}
