import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientInsert, ClientSummary, ClientUpdate } from "@/types";
import { throwIfError } from "./base";
import { buildPaginatedResult, pageRange, type PageParams, type PaginatedResult } from "@/utils/pagination";

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("company");
  throwIfError(error);
  return data ?? [];
}

export async function fetchClientsPage(params: PageParams): Promise<PaginatedResult<Client>> {
  const { from, to } = pageRange(params);
  const { data, error, count } = await supabase
    .from("clients")
    .select("*", { count: "exact" })
    .order("company")
    .range(from, to);
  throwIfError(error);
  return buildPaginatedResult(data ?? [], count ?? 0, params);
}

export async function fetchClientSummaries(): Promise<ClientSummary[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, company, nit, address, contact_name, phone")
    .order("company");
  throwIfError(error);
  return data ?? [];
}

export async function createClient(payload: ClientInsert): Promise<void> {
  const { error } = await supabase.from("clients").insert(payload);
  throwIfError(error);
}

export async function updateClient(id: string, payload: ClientUpdate): Promise<void> {
  const { error } = await supabase.from("clients").update(payload).eq("id", id);
  throwIfError(error);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  throwIfError(error);
}

export async function countClients(): Promise<number> {
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });
  throwIfError(error);
  return count ?? 0;
}
