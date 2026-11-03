import type { ApiResponse } from "./apiClient";

type Page<T> = ApiResponse<T[]> & { meta?: { total?: number; totalPages?: number; limit?: number } };

/**
 * Every row of a paginated list. The API caps a page, so a screen that filters, counts or selects in the browser needs all pages or it
 * silently works on part of the data. A page that fails makes the whole result fail: a partial list would look complete.
 */
export async function listAllPages<T>(fetchPage: (page: number) => Promise<ApiResponse<T[]>>, concurrency = 4): Promise<ApiResponse<T[]>> {
  const first = (await fetchPage(1)) as Page<T>;
  if (!first.success || !Array.isArray(first.data)) return first;
  const meta = first.meta;
  const pageSize = meta?.limit || first.data.length || 1;
  const pageCount = meta?.totalPages ?? Math.ceil((meta?.total ?? first.data.length) / pageSize);
  if (!pageCount || pageCount <= 1) return first;

  const pages = Array.from({ length: pageCount - 1 }, (_, i) => i + 2);
  const rest = new Array<ApiResponse<T[]>>(pages.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, async () => {
    while (next < pages.length) {
      const i = next++;
      rest[i] = await fetchPage(pages[i]);
    }
  }));
  const failed = rest.find((r) => !r.success || !Array.isArray(r.data));
  if (failed) return { success: false, message: failed.message || "Part of the list could not be loaded. Please try again.", status: failed.status };
  return { ...first, data: [...first.data, ...rest.flatMap((r) => r.data as T[])] };
}
