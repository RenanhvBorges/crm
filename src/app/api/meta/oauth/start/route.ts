import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { oauthDialogUrl } from "@/lib/meta/graph";
import { OAUTH_SCOPES, OAUTH_STATE_COOKIE, oauthRedirectUri } from "@/lib/meta/connect";

// Início do Facebook Login. É uma rota GET (e não uma server action) porque o
// destino é externo: assim o navegador segue o 303 direto para o dialog da
// Meta, sem depender de redirect de action. Rotas /api não passam pelo
// proxy.ts, então a sessão é conferida aqui.
export async function GET(request: Request) {
  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", base), 303);

  try {
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(
      oauthDialogUrl(oauthRedirectUri(), state, OAUTH_SCOPES),
      303,
    );
    // State de uso único: o callback só aceita o retorno que casa com este cookie.
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (err) {
    const url = new URL("/settings/integrations/meta", base);
    url.searchParams.set(
      "error",
      err instanceof Error ? err.message : "Não foi possível iniciar a conexão.",
    );
    return NextResponse.redirect(url, 303);
  }
}
