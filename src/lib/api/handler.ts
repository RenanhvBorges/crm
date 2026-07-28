import "server-only";
import { z } from "zod";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiKey } from "@/lib/api-keys";
import type { Database } from "@/lib/supabase/database.types";

export type ApiContext<P = Record<string, string>> = {
  admin: SupabaseClient<Database>;
  userId: string;
  url: URL;
  params: P;
};

type Handler<P> = (request: Request, ctx: ApiContext<P>) => Promise<Response>;

// Envelope padrão da API v1: { data } no sucesso, { error } na falha.
// Autentica pela chave Bearer (oxk_) e converte exceções em 500 — sem sessão
// de cookies aqui, por isso o client de service role.
export function withApiAuth<P = Record<string, string>>(handler: Handler<P>) {
  return async (
    request: Request,
    routeContext: { params: Promise<P> } = { params: Promise.resolve({} as P) },
  ): Promise<Response> => {
    const userId = await authenticateApiKey(request);
    if (!userId) {
      return Response.json(
        { error: "Chave de API ausente, inválida ou revogada." },
        { status: 401 },
      );
    }

    try {
      return await handler(request, {
        admin: createAdminClient(),
        userId,
        url: new URL(request.url),
        params: await routeContext.params,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error("[api/v1] erro não tratado:", err);
      return Response.json({ error: "Erro interno." }, { status: 500 });
    }
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("JSON inválido.", 400);
  }
}

// Valida o corpo com zod v4 e devolve 422 com a lista de problemas.
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(z.prettifyError(result.error), 422);
  }
  return result.data;
}

// PGRST116 = "nenhuma linha retornada" em .single(): recurso inexistente.
export function throwOnDbError(error: PostgrestError | null, notFoundMessage = "Não encontrado."): void {
  if (!error) return;
  if (error.code === "PGRST116") throw new ApiError(notFoundMessage, 404);
  if (error.code === "23505") throw new ApiError("Registro duplicado.", 409);
  if (error.code === "23503") throw new ApiError("Referência inválida em um dos campos.", 422);
  throw new ApiError(error.message, 500);
}

export function deleted(): Response {
  return Response.json({ data: { deleted: true } });
}
