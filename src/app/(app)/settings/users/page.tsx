import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateUserForm } from "./create-user-form";
import { RoleSelect } from "./role-select";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function UsersSettingsPage() {
  const supabase = await createClient();

  // src/proxy.ts já garante uma sessão autenticada em qualquer rota fora de
  // /login, então user nunca é null aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("full_name");

  const isDirector = profiles?.find((p) => p.id === userId)?.role === "diretor_comercial";

  // Reforça no servidor: acessar /settings/users direto pela URL sem ser
  // diretor não passa daqui, mesmo padrão defensivo usado em /tasks pro
  // scope "Toda a equipe".
  if (!isDirector) {
    redirect("/settings");
  }

  // profiles não guarda o status de acesso (banido/ativo) — isso só existe em
  // auth.users, então busca via Admin API (já precisa de service role mesmo).
  const adminClient = createAdminClient();
  const { data: authData } = await adminClient.auth.admin.listUsers();
  const bannedById = new Map(
    (authData?.users ?? []).map((u) => [u.id, Boolean(u.banned_until)]),
  );

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl">Usuários</h1>
      <p className="mb-6 text-sm text-fg-3">
        Cadastre novos usuários e gerencie o acesso da equipe ao CRM.
      </p>

      <div className="mb-6 rounded-lg border border-border-1 bg-oxford-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-fg-1">Novo usuário</h2>
        <CreateUserForm />
      </div>

      <div className="rounded-lg border border-border-1 bg-oxford-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-1 text-left text-xs text-fg-3">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => {
              const isSelf = profile.id === userId;
              const active = !bannedById.get(profile.id);
              return (
                <tr key={profile.id} className="border-b border-border-1 last:border-0">
                  <td className="px-4 py-3">
                    {profile.full_name ?? "—"}
                    {isSelf ? <span className="ml-2 text-xs text-fg-3">(você)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-fg-2">{profile.email}</td>
                  <td className="px-4 py-3">
                    <RoleSelect userId={profile.id} currentRole={profile.role} disabled={isSelf} />
                  </td>
                  <td className="px-4 py-3">
                    <ToggleActiveButton userId={profile.id} active={active} disabled={isSelf} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
