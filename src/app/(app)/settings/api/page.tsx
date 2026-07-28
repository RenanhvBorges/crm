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
          Envie a chave no header{" "}
          <Code>Authorization: Bearer &lt;chave&gt;</Code>. As respostas vêm em{" "}
          <Code>{"{ data }"}</Code>; erros em <Code>{"{ error }"}</Code> com status 400 (JSON
          inválido), 401 (chave), 404, 409 (conflito) ou 422 (validação).
        </p>
        <p className="mb-4 text-sm text-fg-2">
          Listagens aceitam <Code>?limit</Code> (padrão 50, máx. 200) e <Code>?offset</Code>, e
          respondem com <Code>{"meta: { limit, offset, total }"}</Code>.
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-1 text-left text-xs text-fg-3">
              <th className="py-2 font-medium">Recurso</th>
              <th className="py-2 font-medium">Métodos</th>
              <th className="py-2 font-medium">Observações</th>
            </tr>
          </thead>
          <tbody>
            {API_RESOURCES.map((r) => (
              <tr key={r.path} className="border-b border-border-1 align-top last:border-0">
                <td className="py-2">
                  <Code>{r.path}</Code>
                </td>
                <td className="py-2 text-xs text-fg-2">{r.methods}</td>
                <td className="py-2 text-xs text-fg-3">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-fg-1">Webhooks de saída</h3>
        <p className="text-sm text-fg-2">
          Configure em <Code>Configurações → Webhooks</Code> (ou pela API) para receber os eventos
          do CRM assim que acontecerem. Cada entrega é um <Code>POST</Code> com{" "}
          <Code>{"{ id, event_id, type, created_at, data }"}</Code> e o header{" "}
          <Code>X-Oxford-Signature: sha256=HMAC_SHA256(segredo, timestamp + &quot;.&quot; + corpo)</Code>.
        </p>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">{children}</code>;
}

const API_RESOURCES = [
  {
    path: "/api/v1/contacts",
    methods: "GET, POST",
    notes: "Filtros ?q, ?tag, ?list_id. POST aceita ?upsert=email para atualizar por e-mail.",
  },
  { path: "/api/v1/contacts/{id}", methods: "GET, PATCH, DELETE", notes: "—" },
  {
    path: "/api/v1/tags",
    methods: "GET, POST",
    notes: "Catálogo de tags (nome + cor).",
  },
  {
    path: "/api/v1/tags/{id}",
    methods: "PATCH, DELETE",
    notes: "Renomear/excluir propaga para as tags dos contatos.",
  },
  { path: "/api/v1/lists", methods: "GET, POST", notes: "Listas estáticas de contatos." },
  { path: "/api/v1/lists/{id}", methods: "GET, PATCH, DELETE", notes: "GET inclui member_count." },
  {
    path: "/api/v1/lists/{id}/members",
    methods: "GET, POST",
    notes: "POST em lote: { contact_ids: [...] }.",
  },
  { path: "/api/v1/lists/{id}/members/{contactId}", methods: "DELETE", notes: "—" },
  {
    path: "/api/v1/custom-fields",
    methods: "GET, POST",
    notes: "GET exige ?entity=contact|deal.",
  },
  {
    path: "/api/v1/deals",
    methods: "GET, POST",
    notes: "Filtros ?pipeline_id, ?stage_id, ?status, ?contact_id.",
  },
  {
    path: "/api/v1/deals/{id}",
    methods: "GET, PATCH, DELETE",
    notes: "status won/lost preenche closed_at automaticamente.",
  },
  { path: "/api/v1/pipelines", methods: "GET", notes: "Funis com os estágios aninhados." },
  {
    path: "/api/v1/tasks",
    methods: "GET, POST",
    notes: "Filtros ?status, ?contact_id, ?deal_id, ?assigned_to.",
  },
  {
    path: "/api/v1/tasks/{id}",
    methods: "GET, PATCH, DELETE",
    notes: "status done preenche completed_at.",
  },
  { path: "/api/v1/templates", methods: "GET", notes: "Templates de e-mail (leitura)." },
  { path: "/api/v1/campaigns", methods: "GET", notes: "Campanhas manuais (leitura)." },
  { path: "/api/v1/automations", methods: "GET", notes: "Automações e seus gatilhos." },
  {
    path: "/api/v1/automations/{id}/enroll",
    methods: "POST",
    notes: "Inscreve um contato: { contact_id } ou { email }. A automação precisa estar ativa.",
  },
  {
    path: "/api/v1/webhooks",
    methods: "GET, POST",
    notes: "Assinaturas de webhook de saída; a resposta inclui o segredo.",
  },
  { path: "/api/v1/webhooks/{id}", methods: "GET, PATCH, DELETE", notes: "—" },
];
