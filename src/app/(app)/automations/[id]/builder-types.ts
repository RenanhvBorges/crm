import type { NameResolvers } from "@/lib/automations/node-catalog";

// Catálogos de nomes carregados pelo RSC do builder, usados nos selects dos
// editores de nó e nos resumos.
export type BuilderCatalogs = {
  tags: { name: string }[];
  lists: { id: string; name: string }[];
  pipelines: { id: string; name: string }[];
  stages: { id: string; name: string; pipeline_id: string }[];
  campaigns: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
  fields: { key: string; label: string }[];
  profiles: { id: string; name: string }[];
  adConversions: { id: string; name: string; is_active: boolean; google: boolean; meta: boolean }[];
};

export function resolversFrom(catalogs: BuilderCatalogs): NameResolvers {
  return {
    list: (id) => catalogs.lists.find((l) => l.id === id)?.name,
    stage: (id) => catalogs.stages.find((s) => s.id === id)?.name,
    pipeline: (id) => catalogs.pipelines.find((p) => p.id === id)?.name,
    template: (id) => catalogs.templates.find((t) => t.id === id)?.name,
    profile: (id) => catalogs.profiles.find((p) => p.id === id)?.name,
    field: (key) => catalogs.fields.find((f) => f.key === key)?.label,
    adConversion: (id) => catalogs.adConversions.find((c) => c.id === id)?.name,
  };
}
