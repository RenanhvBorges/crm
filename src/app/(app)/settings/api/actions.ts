"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";

export async function createApiKey(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Não autenticado.");
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Informe um nome para a chave.");
  }

  const { token, keyPrefix, keyHash } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    name: trimmed,
    key_prefix: keyPrefix,
    key_hash: keyHash,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/api");
  // Retorna o token em texto puro só desta vez — não é recuperável depois,
  // só o hash fica salvo.
  return token;
}

export async function revokeApiKey(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/api");
}
