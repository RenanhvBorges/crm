"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BulkResult } from "@/lib/bulk";
import type { AdPlatform, GoogleAdsConfig, MetaConfig } from "@/lib/ad-conversions/config";
import {
  removeIntegrationSecret,
  saveGoogleIntegration,
  saveMetaIntegration,
  testIntegrationAction,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none disabled:bg-bg-surface-2";
const labelClass = "mb-1 block text-sm font-medium text-fg-2";
const hintClass = "mt-1 text-xs text-fg-muted";
const buttonClass =
  "rounded-md border border-border-1 px-3 py-1.5 text-xs text-fg-2 hover:bg-bg-surface-2 disabled:opacity-50";

type IntegrationView<C> = {
  isActive: boolean;
  secretHint: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  config: C;
};

export function IntegrationsPanel({
  isDirector,
  google,
  meta,
}: {
  isDirector: boolean;
  google: IntegrationView<GoogleAdsConfig>;
  meta: IntegrationView<MetaConfig>;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg">Integrações</h2>
        <p className="text-sm text-fg-3">
          As credenciais ficam criptografadas no banco (Supabase Vault) e não voltam para a tela depois
          de salvas.
          {isDirector ? "" : " Só o diretor comercial pode alterá-las."}
        </p>
      </div>
      <GoogleCard view={google} disabled={!isDirector} />
      <MetaCard view={meta} disabled={!isDirector} />
    </section>
  );
}

function useActionRunner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkResult | null>(null);
  function run(action: () => Promise<BulkResult>, onOk?: () => void) {
    setResult(null);
    startTransition(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) {
        onOk?.();
        router.refresh();
      }
    });
  }
  return { isPending, result, run };
}

function CardShell({
  title,
  view,
  platform,
  disabled,
  children,
}: {
  title: string;
  view: IntegrationView<unknown>;
  platform: AdPlatform;
  disabled: boolean;
  children: (runner: ReturnType<typeof useActionRunner>) => React.ReactNode;
}) {
  const runner = useActionRunner();
  return (
    <div className="rounded-lg border border-border-1 bg-oxford-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-fg-1">{title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                view.isActive ? "bg-emerald-50 text-emerald-700" : "bg-bg-surface-2 text-fg-3"
              }`}
            >
              {view.isActive ? "Ativa" : "Inativa"}
            </span>
          </div>
          <p className="text-xs text-fg-3">
            {view.secretHint ? `Credencial salva: ${view.secretHint}` : "Nenhuma credencial salva."}
          </p>
          {view.lastTestAt ? (
            <p className={`text-xs ${view.lastTestOk ? "text-emerald-700" : "text-danger"}`}>
              Último teste ({new Date(view.lastTestAt).toLocaleString("pt-BR")}):{" "}
              {view.lastTestMessage}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={disabled || runner.isPending || !view.secretHint}
            onClick={() => runner.run(() => testIntegrationAction(platform))}
            className={buttonClass}
          >
            Testar conexão
          </button>
          {view.secretHint ? (
            <button
              type="button"
              disabled={disabled || runner.isPending}
              onClick={() => {
                if (!confirm("Remover a credencial? A integração será desativada.")) return;
                runner.run(() => removeIntegrationSecret(platform));
              }}
              className={buttonClass}
            >
              Remover credencial
            </button>
          ) : null}
        </div>
      </div>
      {children(runner)}
      {runner.result ? (
        <p className={`mt-3 text-sm ${runner.result.ok ? "text-emerald-700" : "text-danger"}`}>
          {runner.result.message ?? "Salvo."}
        </p>
      ) : null}
    </div>
  );
}

function ActiveCheckbox({ defaultChecked, disabled }: { defaultChecked: boolean; disabled: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-fg-2">
      <input type="checkbox" name="is_active" defaultChecked={defaultChecked} disabled={disabled} />
      Integração ativa (as automações passam a enviar)
    </label>
  );
}

function GoogleCard({ view, disabled }: { view: IntegrationView<GoogleAdsConfig>; disabled: boolean }) {
  const [serviceAccount, setServiceAccount] = useState("");

  return (
    <CardShell title="Google Ads" view={view} platform="google_ads" disabled={disabled}>
      {(runner) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            runner.run(() => saveGoogleIntegration(formData), () => setServiceAccount(""));
          }}
          className="space-y-3"
        >
          <div>
            <label className={labelClass} htmlFor="google-customer-id">
              ID da conta do Google Ads
            </label>
            <input
              id="google-customer-id"
              name="customer_id"
              defaultValue={view.config.customer_id}
              placeholder="123-456-7890"
              disabled={disabled}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="google-service-account">
              Conta de serviço (arquivo .json)
            </label>
            <textarea
              id="google-service-account"
              name="service_account"
              value={serviceAccount}
              onChange={(e) => setServiceAccount(e.target.value)}
              rows={4}
              placeholder={
                view.secretHint
                  ? "Já existe uma conta de serviço salva. Cole outro JSON só para substituir."
                  : 'Cole o conteúdo do JSON ({"type": "service_account", ...}) ou escolha o arquivo abaixo.'
              }
              disabled={disabled}
              className={`${inputClass} font-mono text-xs`}
            />
            <input
              type="file"
              accept=".json,application/json"
              disabled={disabled}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setServiceAccount(await file.text());
              }}
              className="mt-2 block text-xs text-fg-3"
            />
            <p className={hintClass}>
              No Google Cloud: ative a Data Manager API, crie uma conta de serviço e gere uma chave
              JSON. No Google Ads, adicione o e-mail da conta de serviço como usuário da conta.
            </p>
          </div>
          <ActiveCheckbox defaultChecked={view.isActive} disabled={disabled} />
          <button
            type="submit"
            disabled={disabled || runner.isPending}
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white hover:bg-oxford-blue-600 disabled:opacity-60"
          >
            {runner.isPending ? "Salvando..." : "Salvar Google Ads"}
          </button>
        </form>
      )}
    </CardShell>
  );
}

function MetaCard({ view, disabled }: { view: IntegrationView<MetaConfig>; disabled: boolean }) {
  const [accessToken, setAccessToken] = useState("");

  return (
    <CardShell title="Meta (Conversions API)" view={view} platform="meta" disabled={disabled}>
      {(runner) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            runner.run(() => saveMetaIntegration(formData), () => setAccessToken(""));
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="meta-dataset-id">
                ID do dataset (pixel)
              </label>
              <input
                id="meta-dataset-id"
                name="dataset_id"
                defaultValue={view.config.dataset_id}
                placeholder="123456789012345"
                disabled={disabled}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="meta-test-code">
                Código de teste (opcional)
              </label>
              <input
                id="meta-test-code"
                name="test_event_code"
                defaultValue={view.config.test_event_code}
                placeholder="TEST12345"
                disabled={disabled}
                className={inputClass}
              />
            </div>
          </div>
          <p className={hintClass}>
            Com o código de teste preenchido, os eventos aparecem só em Gerenciador de Eventos → Eventos
            de teste. Apague o código para enviar de verdade.
          </p>
          <div>
            <label className={labelClass} htmlFor="meta-token">
              Token de acesso
            </label>
            <input
              id="meta-token"
              name="access_token"
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={view.secretHint ? "Já existe um token salvo. Preencha só para substituir." : "EAAB..."}
              disabled={disabled}
              className={inputClass}
            />
            <p className={hintClass}>
              Gerenciador de Eventos → dataset → Configurações → API de Conversões → Gerar token de
              acesso (ou o token de um usuário do sistema do Business Manager com acesso ao dataset).
            </p>
          </div>
          <ActiveCheckbox defaultChecked={view.isActive} disabled={disabled} />
          <button
            type="submit"
            disabled={disabled || runner.isPending}
            className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white hover:bg-oxford-blue-600 disabled:opacity-60"
          >
            {runner.isPending ? "Salvando..." : "Salvar Meta"}
          </button>
        </form>
      )}
    </CardShell>
  );
}
