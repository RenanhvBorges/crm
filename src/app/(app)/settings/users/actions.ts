"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireDirector() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Não autenticado.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "diretor_comercial") {
    throw new Error("Apenas o diretor comercial pode gerenciar usuários.");
  }

  return { userId: user.id };
}

export async function createUser(formData: FormData) {
  await requireDirector();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "comum");

  if (!fullName) {
    throw new Error("Informe o nome do usuário.");
  }
  if (!email) {
    throw new Error("Informe o e-mail do usuário.");
  }
  if (password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }
  if (role !== "comum" && role !== "diretor_comercial") {
    throw new Error("Role inválido.");
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    if (error.code === "email_exists") {
      throw new Error(`Já existe uma conta com o e-mail "${email}".`);
    }
    throw new Error(error.message);
  }

  // handle_new_user já criou o profile com role='comum'; ajusta se o diretor
  // escolheu diretor_comercial na criação.
  if (role === "diretor_comercial" && data.user) {
    const { error: roleError } = await adminClient
      .from("profiles")
      .update({ role })
      .eq("id", data.user.id);
    if (roleError) {
      throw new Error(roleError.message);
    }
  }

  revalidatePath("/settings/users");
}

export async function updateUserRole(userId: string, role: string) {
  const { userId: callerId } = await requireDirector();

  if (userId === callerId) {
    throw new Error("Você não pode alterar seu próprio role por aqui.");
  }
  if (role !== "comum" && role !== "diretor_comercial") {
    throw new Error("Role inválido.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const { userId: callerId } = await requireDirector();

  if (userId === callerId) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/users");
}
