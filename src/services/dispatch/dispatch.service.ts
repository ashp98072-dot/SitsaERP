import { supabase } from "@/integrations/supabase/client";
import type { Dispatch, DispatchItem } from "@/types";
import { throwIfError } from "../base";
import { buildPaginatedResult, pageRange, type PageParams, type PaginatedResult } from "@/utils/pagination";

export async function fetchDispatches(): Promise<Dispatch[]> {
  const { data, error } = await supabase
    .from("dispatches")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function fetchDispatchesPage(
  params: PageParams,
): Promise<PaginatedResult<Dispatch>> {
  const { from, to } = pageRange(params);
  const { data, error, count } = await supabase
    .from("dispatches")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  throwIfError(error);
  return buildPaginatedResult(data ?? [], count ?? 0, params);
}

export async function fetchDispatchById(id: string): Promise<Dispatch | null> {
  const { data, error } = await supabase.from("dispatches").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data;
}

export async function fetchDispatchItems(dispatchId: string): Promise<DispatchItem[]> {
  const { data, error } = await supabase
    .from("dispatch_items")
    .select("*")
    .eq("dispatch_id", dispatchId);
  throwIfError(error);
  return data ?? [];
}

export async function countDispatches(): Promise<number> {
  const { count, error } = await supabase
    .from("dispatches")
    .select("*", { count: "exact", head: true });
  throwIfError(error);
  return count ?? 0;
}
