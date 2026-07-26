"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { ViewConfig } from "@/lib/contact-columns";

// Salva a preferência de colunas/filtros do usuário para uma view específica.
// Escopo real por usuário (auth.uid()), seguindo o padrão do dashboard_widgets.
export async function saveViewPreferences(viewKey: string, config: ViewConfig) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("contact_view_preferences").upsert(
    {
      user_id: user.id,
      view_key: viewKey,
      config: config as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,view_key" },
  );

  if (error) throw new Error(error.message);
}
