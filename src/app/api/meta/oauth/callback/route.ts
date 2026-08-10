import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  listGrantedScopes,
  listPages,
} from "@/lib/meta/graph";
import { activateConnection, OAUTH_STATE_COOKIE, oauthRedirectUri } from "@/lib/meta/connect";

const SETTINGS_PATH = "/settings/integrations/meta";

function redirectTo(request: Request, params: Record<string, string>) {
  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  const url = new URL(SETTINGS_PATH, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Response.redirect(url, 303);
}

// Retorno do Facebook Login. Rotas /api não passam pelo proxy.ts, então a
// proteção é dupla: sessão do CRM (só quem está logado conecta uma página) e
// o state de uso único gravado em cookie pela server action que abriu o dialog.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.redirect(new URL("/login", process.env.APP_BASE_URL ?? url.origin), 303);
  }

  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (error) return redirectTo(request, { error });

  const state = url.searchParams.get("state");
  if (!expectedState || !state || state !== expectedState) {
    return redirectTo(request, { error: "Sessão de conexão expirada. Tente de novo." });
  }

  const code = url.searchParams.get("code");
  if (!code) return redirectTo(request, { error: "A Meta não devolveu o código de autorização." });

  try {
    const shortLived = await exchangeCodeForToken(code, oauthRedirectUri());
    const userToken = await exchangeForLongLivedToken(shortLived);
    const [pages, scopes] = await Promise.all([
      listPages(userToken),
      listGrantedScopes(userToken).catch(() => [] as string[]),
    ]);

    if (!pages.length) {
      return redirectTo(request, {
        error: "Nenhuma página foi autorizada. Refaça a conexão marcando a página da Oxford.",
      });
    }

    if (!scopes.includes("leads_retrieval")) {
      return redirectTo(request, {
        error:
          "A permissão leads_retrieval não foi concedida — sem ela a Meta não libera os dados dos leads.",
      });
    }

    const admin = createAdminClient();

    // Uma linha por página autorizada; a ativação (assinatura do webhook) é um
    // passo à parte para o caso de virem várias e o usuário ter que escolher.
    const { data: saved, error: upsertError } = await admin
      .from("meta_connections")
      .upsert(
        pages.map((page) => ({
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          scopes,
        })),
        { onConflict: "page_id" },
      )
      .select("id, page_id");
    if (upsertError) throw new Error(upsertError.message);

    if (pages.length === 1 && saved?.length === 1) {
      await activateConnection(admin, saved[0].id);
      return redirectTo(request, { connected: pages[0].name });
    }

    return redirectTo(request, { choose: "1" });
  } catch (err) {
    console.error("[meta-leads] falha no OAuth:", err);
    return redirectTo(request, {
      error: err instanceof Error ? err.message : "Não foi possível concluir a conexão.",
    });
  }
}
