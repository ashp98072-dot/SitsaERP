export const DEFAULT_PAGE_SIZE = 25;

export type PageParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function pageRange({ page, pageSize }: PageParams): { from: number; to: number } {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

export function buildPaginatedResult<T>(
  rows: T[],
  total: number,
  params: PageParams,
): PaginatedResult<T> {
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount,
  };
}
