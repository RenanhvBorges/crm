"use client";

import { useState } from "react";
import { TRIGGER_TYPES, parseTriggerConfig, triggerDefinition } from "@/lib/automations/triggers";

const inputClass =
  "w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-fg-2";

export type TriggerCatalogs = {
  tags: { name: string }[];
  lists: { id: string; name: string }[];
  pipelines: { id: string; name: string }[];
  stages: { id: string; name: string; pipeline_id: string }[];
  campaigns: { id: string; name: string }[];
  metaForms: { id: string; name: string }[];
};

// Select de gatilho + campos de configuração condicionais (inputs `trigger_*`
// lidos por parseTriggerFromFormData). Usado no form de criação e no builder.
export function TriggerConfigFields({
  catalogs,
  initialTriggerType,
  initialConfig,
}: {
  catalogs: TriggerCatalogs;
  initialTriggerType?: string;
  initialConfig?: unknown;
}) {
  const config = parseTriggerConfig(initialConfig);
  const [triggerType, setTriggerType] = useState(initialTriggerType ?? "contact_created");
  const [pipelineId, setPipelineId] = useState(config.pipelineId ?? "");
  const [scoreMode, setScoreMode] = useState(config.mode ?? "any");

  const def = triggerDefinition(triggerType);
  const stagesOfPipeline = catalogs.stages.filter(
    (s) => !pipelineId || s.pipeline_id === pipelineId,
  );

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="trigger_type" className={labelClass}>
          Gatilho
        </label>
        <select
          id="trigger_type"
          name="trigger_type"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
          className={inputClass}
        >
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {def ? <p className="mt-1 text-xs text-fg-muted">{def.description}</p> : null}
      </div>

      {def?.configKind === "tag" ? (
        <div>
          <label htmlFor="trigger_tag" className={labelClass}>
            Tag (vazio = qualquer tag)
          </label>
          <select id="trigger_tag" name="trigger_tag" defaultValue={config.tag ?? ""} className={inputClass}>
            <option value="">Qualquer tag</option>
            {catalogs.tags.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {def?.configKind === "list" ? (
        <div>
          <label htmlFor="trigger_list_id" className={labelClass}>
            Lista (vazio = qualquer lista)
          </label>
          <select
            id="trigger_list_id"
            name="trigger_list_id"
            defaultValue={config.listId ?? ""}
            className={inputClass}
          >
            <option value="">Qualquer lista</option>
            {catalogs.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {def?.configKind === "pipeline" || def?.configKind === "pipeline_stage" ? (
        <div>
          <label htmlFor="trigger_pipeline_id" className={labelClass}>
            Funil (vazio = qualquer funil)
          </label>
          <select
            id="trigger_pipeline_id"
            name="trigger_pipeline_id"
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
            className={inputClass}
          >
            <option value="">Qualquer funil</option>
            {catalogs.pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {def?.configKind === "pipeline_stage" ? (
        <div>
          <label htmlFor="trigger_stage_id" className={labelClass}>
            Estágio de entrada (vazio = qualquer estágio)
          </label>
          <select
            id="trigger_stage_id"
            name="trigger_stage_id"
            defaultValue={config.stageId ?? ""}
            className={inputClass}
          >
            <option value="">Qualquer estágio</option>
            {stagesOfPipeline.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {def?.configKind === "campaign" ? (
        <div>
          <label htmlFor="trigger_campaign_id" className={labelClass}>
            Campanha (vazio = qualquer campanha)
          </label>
          <select
            id="trigger_campaign_id"
            name="trigger_campaign_id"
            defaultValue={config.campaignId ?? ""}
            className={inputClass}
          >
            <option value="">Qualquer campanha</option>
            {catalogs.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {def?.configKind === "meta_form" ? (
        <div>
          <label htmlFor="trigger_form_id" className={labelClass}>
            Formulário instantâneo (vazio = qualquer formulário)
          </label>
          <select
            id="trigger_form_id"
            name="trigger_form_id"
            defaultValue={config.formId ?? ""}
            className={inputClass}
          >
            <option value="">Qualquer formulário</option>
            {catalogs.metaForms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {def?.configKind === "score" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trigger_score_mode" className={labelClass}>
              Condição
            </label>
            <select
              id="trigger_score_mode"
              name="trigger_score_mode"
              value={scoreMode}
              onChange={(e) => setScoreMode(e.target.value as typeof scoreMode)}
              className={inputClass}
            >
              <option value="any">Qualquer mudança</option>
              <option value="crosses_above">Subiu para (limiar)</option>
              <option value="crosses_below">Caiu abaixo de (limiar)</option>
            </select>
          </div>
          {scoreMode !== "any" ? (
            <div>
              <label htmlFor="trigger_score_value" className={labelClass}>
                Limiar
              </label>
              <input
                id="trigger_score_value"
                name="trigger_score_value"
                type="number"
                defaultValue={config.value ?? 0}
                className={inputClass}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
