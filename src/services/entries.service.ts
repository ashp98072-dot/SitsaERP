import { supabase } from "@/integrations/supabase/client";
import type { WarehouseEntry, WarehouseEntryInsert } from "@/types";
import { throwIfError } from "./base";
import { registerWarehouseEntryRpc, type RegisterEntryPayload } from "./operations.service";
import { buildPaginatedResult, pageRange, type PageParams, type PaginatedResult } from "@/utils/pagination";

export async function fetchWarehouseEntries(): Promise<WarehouseEntry[]> {
  const { data, error } = await supabase
    .from("warehouse_entries")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createWarehouseEntry(payload: WarehouseEntryInsert): Promise<WarehouseEntry> {
  const rpcPayload: RegisterEntryPayload = {
    product_id: payload.product_id,
    supplier_id: payload.supplier_id ?? null,
    quantity: Number(payload.quantity),
    weight: Number(payload.weight),
    unit: payload.unit ?? "lbs",
    entry_date: payload.entry_date ?? new Date().toISOString().slice(0, 10),
    notes: payload.notes ?? null,
  };
  return registerWarehouseEntryRpc(rpcPayload);
}

export async function fetchWarehouseEntriesPage(
  params: PageParams,
): Promise<PaginatedResult<WarehouseEntry>> {
  const { from, to } = pageRange(params);
  const { data, error, count } = await supabase
    .from("warehouse_entries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  throwIfError(error);
  return buildPaginatedResult(data ?? [], count ?? 0, params);
}

export async function countWarehouseEntries(): Promise<number> {
  const { count, error } = await supabase
    .from("warehouse_entries")
    .select("*", { count: "exact", head: true });
  throwIfError(error);
  return count ?? 0;
}
