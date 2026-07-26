import { createClient } from "@/lib/supabase/server";
import { DeleteFieldButton } from "@/components/delete-field-button";
import { GenerateKeyForm } from "./generate-key-form";
import { revokeApiKey } from "./actions";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export default async function ApiSettingsPage() {
  const supabase = await createClient();

  // RLS de api_keys já restringe a leitura às chaves do próprio usuário
  // (auth.uid()), mesmo padrão de dashboard_widgets/contact_view_preferences.
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">API</h1>
      <p className="mb-6 text-sm text-fg-3">
        Gere chaves para integrar sistemas externos ao CRM.
      </p>

      <div className="mb-6 rounded-lg border border-border-1 bg-oxford-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-fg-1">Suas chaves</h2>
        <div className="mb-4">
          <GenerateKeyForm />
        </div>

        {(keys ?? []).length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-1 text-left text-xs text-fg-3">
                <th className="py-2 font-medium">Nome</th>
                <th className="py-2 font-medium">Chave</th>
                <th className="py-2 font-medium">Criada em</th>
                <th className="py-2 font-medium">Último uso</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(keys ?? []).map((key) => (
                <tr key={key.id} className="border-b border-border-1 last:border-0">
                  <td className="py-2">{key.name}</td>
                  <td className="py-2 font-mono text-xs text-fg-2">{key.key_prefix}…</td>
                  <td className="py-2 text-fg-2">{formatDate(key.created_at)}</td>
                  <td className="py-2 text-fg-2">{formatDate(key.last_used_at)}</td>
                  <td className="py-2 text-right">
                    {key.revoked_at ? (
                      <span className="text-xs text-fg-3">Revogada</span>
                    ) : (
                      <DeleteFieldButton
                        fieldId={key.id}
                        deleteAction={revokeApiKey}
                        confirmMessage="Revogar esta chave de API? Integrações que usam ela param de funcionar imediatamente."
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-fg-3">Nenhuma chave gerada ainda.</p>
        )}
      </div>

      <div className="rounded-lg border border-border-1 bg-oxford-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-fg-1">Como usar</h2>
        <p className="mb-3 text-sm text-fg-2">
          Envie a chave no header <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">Authorization: Bearer &lt;chave&gt;</code>.
        </p>
        <ul className="space-y-1 text-sm text-fg-2">
          <li>
            <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">GET /api/v1/contacts</code>
            {" — lista os contatos"}
          </li>
          <li>
            <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">POST /api/v1/contacts</code>
            {" — cria um contato (name obrigatório; email, phone, company, tags, custom_fields opcionais)"}
          </li>
        </ul>
      </div>
    </div>
  );
}
