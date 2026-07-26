import { createClient } from "@/lib/supabase/server";
import { AudiencePicker } from "@/components/audience-picker";
import { createCampaign } from "../actions";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const [{ data: contacts }, { data: lists }] = await Promise.all([
    supabase.from("contacts").select("id, name, email").order("name"),
    supabase.from("contact_lists").select("id, name").order("sort_order"),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl">Nova campanha</h1>
      <p className="mb-6 text-sm text-fg-3">
        Defina o nome interno, o assunto e o público. O conteúdo do e-mail é editado na
        próxima tela.
      </p>

      <form
        action={createCampaign}
        className="space-y-4 rounded-lg border border-border-1 bg-oxford-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">
            Nome da campanha
          </label>
          <input
            name="name"
            required
            placeholder="ex: Promoção de julho"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
          <p className="mt-1 text-xs text-fg-muted">Uso interno, o destinatário não vê.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-2">
            Assunto do e-mail
          </label>
          <input
            name="subject"
            required
            placeholder="ex: Uma oferta especial pra você"
            className="w-full rounded-md border border-border-1 px-3 py-2 text-sm focus:border-border-brand focus:outline-none"
          />
        </div>

        <AudiencePicker
          contacts={(contacts ?? []).map((c) => ({
            id: c.id,
            label: c.email ? `${c.name} (${c.email})` : c.name,
          }))}
          lists={(lists ?? []).map((l) => ({ id: l.id, label: l.name }))}
        />

        <button
          type="submit"
          className="rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
        >
          Criar campanha
        </button>
      </form>
    </div>
  );
}
