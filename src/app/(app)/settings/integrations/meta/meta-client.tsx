"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plug, RefreshCw } from "lucide-react";
import {
  ATTRIBUTION_KEYS,
  ATTRIBUTION_LABEL,
  FIXED_TARGETS,
  FIXED_TARGET_LABEL,
  defaultMappings,
  parseFieldMappings,
  type FieldMapping,
  type FieldMappings,
  type FixedTarget,
  type FormQuestion,
} from "@/lib/meta/field-mapping";
import { DeleteFieldButton } from "@/components/delete-field-button";
import {
  activatePage,
  disconnectPage,
  refreshForms,
  reprocessLead,
  saveDefaults,
  saveFormConfig,
  syncNow,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-fg-2";
const buttonClass =
  "rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50";
const primaryClass =
  "rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600 disabled:opacity-60";

export type ConnectionRow = {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  default_list_id: string | null;
  default_tags: string[];
  webhook_subscribed_at: string | null;
  last_synced_at: string | null;
};

export type LeadFormRow = {
  id: string;
  form_id: string;
  name: string;
  status: string | null;
  is_enabled: boolean;
  target_list_id: string | null;
  tags: string[];
  field_mappings: unknown;
  questions: unknown;
  last_polled_at: string | null;
};

export type LeadRow = {
  id: string;
  leadgen_id: string;
  formName: string;
  status: string;
  error_message: string | null;
  created_at: string;
  contactId: string | null;
  contactName: string | null;
};

type ListOption = { id: string; name: string };
type FieldOption = { key: string; label: string };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

// Botão que roda uma server action mostrando pendência e erro no lugar.
function ActionButton({
  onRun,
  children,
  className = buttonClass,
  confirmMessage,
}: {
  onRun: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <button
        type="button"
        disabled={isPending}
        className={className}
        onClick={() => {
          if (confirmMessage && !confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            try {
              await onRun();
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Não foi possível concluir.");
            }
          });
        }}
      >
        {isPending ? "Aguarde..." : children}
      </button>
    </span>
  );
}

export function MetaClient({
  connections,
  forms,
  lists,
  customFields,
  leads,
  callbackUrl,
  env,
  notice,
}: {
  connections: ConnectionRow[];
  forms: LeadFormRow[];
  lists: ListOption[];
  customFields: FieldOption[];
  leads: LeadRow[];
  callbackUrl: string;
  env: { app: boolean; verifyToken: boolean };
  notice: { connected: string | null; error: string | null };
}) {
  const active = connections.find((c) => c.is_active) ?? null;
  const inactive = connections.filter((c) => !c.is_active);

  return (
    <div className="space-y-6">
      {notice.error ? (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {notice.error}
        </p>
      ) : null}
      {notice.connected ? (
        <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          Página <strong>{notice.connected}</strong> conectada. Novos leads passam a chegar
          sozinhos.
        </p>
      ) : null}

      {!env.app || !env.verifyToken ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Faltam variáveis de ambiente:{" "}
          {[!env.app ? "META_APP_ID / META_APP_SECRET" : null, !env.verifyToken ? "META_WEBHOOK_VERIFY_TOKEN" : null]
            .filter(Boolean)
            .join(" e ")}
          . A conexão e o webhook não funcionam sem elas.
        </p>
      ) : null}

      <ConnectionSection active={active} inactive={inactive} />

      {active ? (
        <>
          <DefaultsSection connection={active} lists={lists} />
          <FormsSection forms={forms} lists={lists} customFields={customFields} />
        </>
      ) : null}

      <HistorySection leads={leads} />

      <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg-2">Configuração no app da Meta</h2>
        <p className="text-sm text-fg-3">
          Em <em>Webhooks → Página</em>, use a URL de callback{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">{callbackUrl}</code>, o
          token de verificação de{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">
            META_WEBHOOK_VERIFY_TOKEN
          </code>{" "}
          e assine o campo{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">leadgen</code>.
        </p>
        <p className="mt-2 text-sm text-fg-3">
          Em <em>Facebook Login → URIs de redirecionamento válidas</em>, cadastre{" "}
          <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-xs">
            {callbackUrl.replace("/api/meta/webhooks/leads", "/api/meta/oauth/callback")}
          </code>
          .
        </p>
        <p className="mt-2 text-sm text-fg-3">
          O webhook é o caminho normal; a cada 15 minutos o CRM ainda varre os formulários atrás
          de leads que não chegaram. A Meta guarda leads por 90 dias — é até onde a primeira
          sincronização consegue voltar.
        </p>
      </div>
    </div>
  );
}

function ConnectionSection({
  active,
  inactive,
}: {
  active: ConnectionRow | null;
  inactive: ConnectionRow[];
}) {
  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg-2">Página conectada</h2>
          {active ? (
            <>
              <p className="mt-1 text-sm text-fg-1">
                {active.page_name}{" "}
                <span className="text-xs text-fg-3">· ID {active.page_id}</span>
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Webhook assinado em {formatDate(active.webhook_subscribed_at)} · última
                sincronização {formatDate(active.last_synced_at)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-fg-3">
              Nenhuma página conectada. Conecte para começar a receber os leads.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {active ? (
            <>
              <ActionButton onRun={() => syncNow()}>
                <span className="flex items-center gap-1">
                  <RefreshCw size={12} strokeWidth={1.5} />
                  Sincronizar agora
                </span>
              </ActionButton>
              <DeleteFieldButton
                fieldId={active.id}
                deleteAction={disconnectPage}
                confirmMessage="Desconectar a página? Novos leads deixam de entrar no CRM. Os contatos já criados permanecem."
              />
            </>
          ) : (
            <Link
              href="/api/meta/oauth/start"
              className={`${primaryClass} flex items-center gap-2`}
            >
              <Plug size={16} strokeWidth={1.5} />
              Conectar página
            </Link>
          )}
        </div>
      </div>

      {inactive.length ? (
        <div className="mt-4 border-t border-border-1 pt-3">
          <p className={labelClass}>Outras páginas autorizadas</p>
          <ul className="divide-y divide-border-1">
            {inactive.map((connection) => (
              <li key={connection.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-fg-2">{connection.page_name}</span>
                <ActionButton onRun={() => activatePage(connection.id)}>Ativar</ActionButton>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DefaultsSection({
  connection,
  lists,
}: {
  connection: ConnectionRow;
  lists: ListOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          try {
            await saveDefaults(formData);
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível salvar.");
          }
        });
      }}
      className="space-y-3 rounded-lg border border-border-1 bg-oxford-white p-4"
    >
      <h2 className="text-sm font-semibold text-fg-2">Destino padrão dos leads</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="default_list_id" className={labelClass}>
            Lista
          </label>
          <select
            id="default_list_id"
            name="default_list_id"
            defaultValue={connection.default_list_id ?? ""}
            className={inputClass}
          >
            <option value="">Não adicionar a nenhuma lista</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="default_tags" className={labelClass}>
            Tags (separadas por vírgula)
          </label>
          <input
            id="default_tags"
            name="default_tags"
            defaultValue={connection.default_tags.join(", ")}
            placeholder="Meta Ads"
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs text-fg-muted">
        Cada formulário pode apontar para outra lista; sem override, vale este padrão.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Salvo.</p> : null}

      <button type="submit" disabled={isPending} className={primaryClass}>
        {isPending ? "Salvando..." : "Salvar padrões"}
      </button>
    </form>
  );
}

function FormsSection({
  forms,
  lists,
  customFields,
}: {
  forms: LeadFormRow[];
  lists: ListOption[];
  customFields: FieldOption[];
}) {
  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white">
      <div className="flex items-center justify-between border-b border-border-1 px-4 py-3">
        <h2 className="text-sm font-semibold text-fg-2">Formulários instantâneos</h2>
        <ActionButton onRun={() => refreshForms()}>Recarregar da Meta</ActionButton>
      </div>

      {forms.length ? (
        <ul className="divide-y divide-border-1">
          {forms.map((form) => (
            <FormItem key={form.id} form={form} lists={lists} customFields={customFields} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Nenhum formulário encontrado nesta página.
        </p>
      )}
    </div>
  );
}

function FormItem({
  form,
  lists,
  customFields,
}: {
  form: LeadFormRow;
  lists: ListOption[];
  customFields: FieldOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const questions = (Array.isArray(form.questions) ? form.questions : []) as FormQuestion[];
  // O salvo tem prioridade; o que faltar cai no auto-mapeamento, que é o mesmo
  // que a ingestão aplica quando o formulário nunca foi configurado.
  const initialMappings: FieldMappings = {
    ...defaultMappings(questions),
    ...parseFieldMappings(form.field_mappings),
  };
  const [mappings, setMappings] = useState<FieldMappings>(initialMappings);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-fg-1">{form.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                form.is_enabled ? "bg-emerald-50 text-emerald-700" : "bg-bg-surface-2 text-fg-3"
              }`}
            >
              {form.is_enabled ? "Ativo" : "Pausado"}
            </span>
          </div>
          <p className="text-xs text-fg-3">
            {questions.length} pergunta{questions.length === 1 ? "" : "s"} ·{" "}
            {form.target_list_id
              ? `lista ${lists.find((l) => l.id === form.target_list_id)?.name ?? "selecionada"}`
              : "lista padrão"}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className={buttonClass}>
          {open ? "Fechar" : "Configurar"}
        </button>
      </div>

      {open ? (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await saveFormConfig(form.id, formData);
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível salvar.");
              }
            });
          }}
          className="mt-3 space-y-3 border-t border-border-1 pt-3"
        >
          <input type="hidden" name="field_mappings" value={JSON.stringify(mappings)} />

          <label className="flex items-center gap-2 text-sm text-fg-2">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked={form.is_enabled}
              className="rounded border-border-1"
            />
            Receber leads deste formulário
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Lista de destino</label>
              <select
                name="target_list_id"
                defaultValue={form.target_list_id ?? ""}
                className={inputClass}
              >
                <option value="">Usar a lista padrão</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tags extras (separadas por vírgula)</label>
              <input name="tags" defaultValue={form.tags.join(", ")} className={inputClass} />
            </div>
          </div>

          <MappingEditor
            questions={questions}
            customFields={customFields}
            mappings={mappings}
            onChange={setMappings}
          />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button type="submit" disabled={isPending} className={primaryClass}>
            {isPending ? "Salvando..." : "Salvar formulário"}
          </button>
        </form>
      ) : null}
    </li>
  );
}

function encodeMapping(mapping: FieldMapping | undefined): string {
  if (!mapping || mapping.target === "ignore") return "ignore";
  return `${mapping.target}:${mapping.key}`;
}

function decodeMapping(value: string): FieldMapping {
  if (value.startsWith("fixed:")) {
    return { target: "fixed", key: value.slice("fixed:".length) as FixedTarget };
  }
  if (value.startsWith("custom:")) return { target: "custom", key: value.slice("custom:".length) };
  return { target: "ignore" };
}

function MappingEditor({
  questions,
  customFields,
  mappings,
  onChange,
}: {
  questions: FormQuestion[];
  customFields: FieldOption[];
  mappings: FieldMappings;
  onChange: (next: FieldMappings) => void;
}) {
  function set(key: string, value: string) {
    onChange({ ...mappings, [key]: decodeMapping(value) });
  }

  return (
    <div>
      <p className={labelClass}>Mapeamento de campos</p>

      {questions.length ? (
        <ul className="space-y-2">
          {questions.map((question) => (
            <li key={question.key} className="grid grid-cols-2 items-center gap-3">
              <span className="truncate text-sm text-fg-2" title={question.key}>
                {question.label || question.key}
              </span>
              <select
                value={encodeMapping(mappings[question.key])}
                onChange={(e) => set(question.key, e.target.value)}
                className={inputClass}
              >
                <option value="ignore">Não importar</option>
                {FIXED_TARGETS.map((target) => (
                  <option key={target} value={`fixed:${target}`}>
                    {FIXED_TARGET_LABEL[target]}
                  </option>
                ))}
                {customFields.map((field) => (
                  <option key={field.key} value={`custom:${field.key}`}>
                    {field.label} (personalizado)
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg-muted">
          As perguntas aparecem depois de recarregar os formulários da Meta.
        </p>
      )}

      <p className="mb-2 mt-4 text-xs font-medium text-fg-3">
        Atribuição — de onde o lead veio, gravada em campos personalizados
      </p>
      {customFields.length ? (
        <ul className="space-y-2">
          {ATTRIBUTION_KEYS.map((key) => (
            <li key={key} className="grid grid-cols-2 items-center gap-3">
              <span className="truncate text-sm text-fg-2">{ATTRIBUTION_LABEL[key]}</span>
              <select
                value={encodeMapping(mappings[key])}
                onChange={(e) => set(key, e.target.value)}
                className={inputClass}
              >
                <option value="ignore">Não importar</option>
                {customFields.map((field) => (
                  <option key={field.key} value={`custom:${field.key}`}>
                    {field.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg-muted">
          Crie campos personalizados de contato em{" "}
          <Link href="/contacts/fields" className="text-fg-brand hover:underline">
            Contatos → Campos
          </Link>{" "}
          para guardar campanha e anúncio de origem.
        </p>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Na fila",
  processed: "Importado",
  error: "Erro",
  ignored: "Ignorado",
};

function HistorySection({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white">
      <div className="border-b border-border-1 px-4 py-3">
        <h2 className="text-sm font-semibold text-fg-2">Últimos leads recebidos</h2>
      </div>

      {leads.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-1 text-left text-xs text-fg-3">
              <th className="px-4 py-2 font-medium">Quando</th>
              <th className="px-4 py-2 font-medium">Formulário</th>
              <th className="px-4 py-2 font-medium">Contato</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border-1 align-top last:border-0">
                <td className="px-4 py-2 text-xs text-fg-2">{formatDate(lead.created_at)}</td>
                <td className="px-4 py-2 text-xs text-fg-2">{lead.formName}</td>
                <td className="px-4 py-2 text-xs">
                  {lead.contactId ? (
                    <Link
                      href={`/contacts/${lead.contactId}`}
                      className="text-fg-brand hover:underline"
                    >
                      {lead.contactName ?? "Ver contato"}
                    </Link>
                  ) : (
                    <span className="text-fg-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  <span
                    className={
                      lead.status === "processed"
                        ? "text-emerald-700"
                        : lead.status === "error"
                          ? "text-danger"
                          : "text-fg-3"
                    }
                  >
                    {STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                  {lead.error_message ? (
                    <span className="block text-fg-muted">{lead.error_message}</span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-right">
                  {lead.status === "error" || lead.status === "ignored" ? (
                    <ActionButton onRun={() => reprocessLead(lead.id)}>Reprocessar</ActionButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Nenhum lead recebido ainda.
        </p>
      )}
    </div>
  );
}
