import "server-only";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type Pagination = { limit: number; offset: number; from: number; to: number };

export function getPagination(url: URL): Pagination {
  const rawLimit = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const rawOffset = Number(url.searchParams.get("offset") ?? 0);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

  return { limit, offset, from: offset, to: offset + limit - 1 };
}

export function paginated<T>(data: T[], count: number | null, pagination: Pagination): Response {
  return Response.json({
    data,
    meta: { limit: pagination.limit, offset: pagination.offset, total: count ?? 0 },
  });
}
