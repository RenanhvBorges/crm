import { ChartColumn } from "lucide-react";

export default function EmailMetricsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Métricas</h1>
      <p className="mb-6 text-sm text-fg-3">
        Dashboard de métricas de e-mail marketing, personalizável por usuário.
      </p>

      <div className="flex items-center gap-4 rounded-lg border border-border-1 bg-oxford-white p-4 opacity-70">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-surface-2 text-fg-3">
          <ChartColumn size={20} strokeWidth={1.5} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg-1">Widgets de métricas</p>
          <p className="text-xs text-fg-3">
            Por enquanto, veja aberturas/cliques por campanha em Marketing → Campanhas.
          </p>
        </div>
        <span className="rounded-full bg-bg-surface-2 px-2 py-0.5 text-xs text-fg-3">
          em breve
        </span>
      </div>
    </div>
  );
}
