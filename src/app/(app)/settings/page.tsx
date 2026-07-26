import { Mail, type LucideIcon } from "lucide-react";

type SettingSection = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Seções planejadas para as próximas fases. Ainda sem funcionalidade —
// este é só o esqueleto do novo menu de Configurações globais do app.
const UPCOMING_SECTIONS: SettingSection[] = [
  {
    icon: Mail,
    title: "Domínios de e-mail",
    description: "Configurar domínios de envio para campanhas e automações.",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Configurações</h1>
      <p className="mb-6 text-sm text-fg-3">
        Ajustes gerais do app. As configurações de funil agora ficam em{" "}
        <span className="text-fg-2">Negócios → Configurações de funil</span>.
      </p>

      <div className="space-y-3">
        {UPCOMING_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="flex items-center gap-4 rounded-lg border border-border-1 bg-oxford-white p-4 opacity-70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-surface-2 text-fg-3">
              <section.icon size={20} strokeWidth={1.5} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg-1">{section.title}</p>
              <p className="text-xs text-fg-3">{section.description}</p>
            </div>
            <span className="rounded-full bg-bg-surface-2 px-2 py-0.5 text-xs text-fg-3">
              em breve
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
