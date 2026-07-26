import { createClient } from "@/lib/supabase/server";
import { DeleteFieldButton } from "@/components/delete-field-button";
import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
} from "./actions";

export default async function DealPipelinesPage() {
  const supabase = await createClient();
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name, is_default, pipeline_stages(id, name, color, sort_order)")
    .order("sort_order");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Configurações de funil</h1>
      <p className="mb-6 text-sm text-fg-3">
        Gerencie os funis de negócios e seus estágios.
      </p>

      <div className="space-y-6">
        {pipelines?.map((pipeline) => {
          const stages = [...pipeline.pipeline_stages].sort(
            (a, b) => a.sort_order - b.sort_order,
          );
          return (
            <div key={pipeline.id} className="rounded-lg border border-border-1 bg-oxford-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-fg-1">
                  {pipeline.name}
                  {pipeline.is_default ? (
                    <span className="ml-2 rounded-full bg-oxford-blue-50 px-2 py-0.5 text-xs text-oxford-blue">
                      padrão
                    </span>
                  ) : null}
                </h3>
                {!pipeline.is_default ? (
                  <DeleteFieldButton
                    fieldId={pipeline.id}
                    deleteAction={deletePipeline}
                    confirmMessage="Excluir este funil?"
                  />
                ) : null}
              </div>

              <ul className="mb-3 divide-y divide-border-1">
                {stages.map((stage) => (
                  <li key={stage.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-fg-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </span>
                    <DeleteFieldButton
                      fieldId={stage.id}
                      deleteAction={deleteStage}
                      confirmMessage="Excluir este estágio?"
                    />
                  </li>
                ))}
              </ul>

              <form action={createStage} className="flex gap-2">
                <input type="hidden" name="pipeline_id" value={pipeline.id} />
                <input
                  name="name"
                  required
                  placeholder="Nome do novo estágio"
                  className="flex-1 rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
                />
                <input
                  name="color"
                  type="color"
                  defaultValue="#263fa3"
                  className="h-9 w-12 rounded-md border border-border-1"
                />
                <button
                  type="submit"
                  className="rounded-md bg-oxford-blue px-3 py-2 text-sm text-white hover:bg-oxford-blue-600"
                >
                  Adicionar
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <form
        action={createPipeline}
        className="mt-6 flex gap-2 rounded-lg border border-border-1 bg-oxford-white p-4"
      >
        <input
          name="name"
          required
          placeholder="Nome do novo funil"
          className="flex-1 rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white hover:bg-oxford-blue-600"
        >
          Criar funil
        </button>
      </form>
    </div>
  );
}
