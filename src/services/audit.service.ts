import { supabase } from "@/integrations/supabase/client";
import type { AuditLog } from "@/types";
import { throwIfError } from "./base";
import { buildPaginatedResult, pageRange, type PageParams, type PaginatedResult } from "@/utils/pagination";

export async function fetchAuditLogsPage(
  params: PageParams,
): Promise<PaginatedResult<AuditLog>> {
  const { from, to } = pageRange(params);

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  throwIfError(error);
  return buildPaginatedResult((data ?? []) as AuditLog[], count ?? 0, params);
}
