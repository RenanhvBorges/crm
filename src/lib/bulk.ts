// Utilitários das ações em massa. Sem dependências de servidor nem de cliente,
// então serve tanto às server actions quanto aos componentes (import type).

// Server actions são endpoints públicos: o array de ids vem do cliente e é
// tratado como entrada não confiável.
export const MAX_BULK_IDS = 5000;

// Cada .in("id", [...]) vai na URL do PostgREST; lotes pequenos evitam estourar
// o limite de tamanho de URL.
export const BULK_CHUNK_SIZE = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BulkResult = { ok: true; message?: string } | { ok: false; message: string };

// Server actions em produção mascaram a mensagem de erros lançados, então as
// ações em massa devolvem o erro como valor em vez de dar throw.
export async function runBulk(fn: () => Promise<string | void>): Promise<BulkResult> {
  try {
    const message = await fn();
    return message ? { ok: true, message } : { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Não foi possível concluir a ação.",
    };
  }
}

export function parseIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) throw new Error("Seleção inválida.");
  const unique = Array.from(new Set(ids.map(String)));
  if (!unique.length) throw new Error("Selecione ao menos um item.");
  if (unique.length > MAX_BULK_IDS) {
    throw new Error(`Selecione no máximo ${MAX_BULK_IDS} itens por vez.`);
  }
  if (unique.some((id) => !UUID_RE.test(id))) throw new Error("Seleção inválida.");
  return unique;
}

export function chunk<T>(items: T[], size = BULK_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
