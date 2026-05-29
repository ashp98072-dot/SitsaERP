import { supabase } from "@/integrations/supabase/client";
import type { Dispatch, DispatchLineItem, NewDispatchHeader } from "@/types";
import type { DispatchAction, DispatchDashboardStats } from "@/types/dispatch";
import { throwIfError } from "../base";

export type DispatchDraftPayload = NewDispatchHeader & {
  destination?: string;
  logistics_notes?: string;
  warehouse_id?: string | null;
  items: DispatchLineItem[];
};

function mapItems(items: DispatchLineItem[]) {
  return items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    weight: item.weight,
    unit: item.unit,
    notes: item.notes ?? null,
  }));
}

function headerRpcArgs(header: Omit<DispatchDraftPayload, "items">) {
  return {
    p_client_id: header.client_id,
    p_dispatch_date: header.dispatch_date,
    p_driver: header.driver ?? "",
    p_vehicle: header.vehicle ?? "",
    p_destination: header.destination ?? "",
    p_notes: header.notes ?? "",
    p_logistics_notes: header.logistics_notes ?? "",
    p_warehouse_id: header.warehouse_id ?? null,
  };
}

export async function createDispatchDraft(payload: DispatchDraftPayload): Promise<Dispatch> {
  const { data, error } = await supabase.rpc("create_dispatch_draft", {
    ...headerRpcArgs(payload),
    p_items: mapItems(payload.items),
  });
  throwIfError(error);
  return data as Dispatch;
}

export async function updateDispatchDraft(
  dispatchId: string,
  payload: DispatchDraftPayload,
): Promise<Dispatch> {
  const { data, error } = await supabase.rpc("update_dispatch_draft", {
    p_dispatch_id: dispatchId,
    ...headerRpcArgs(payload),
    p_items: mapItems(payload.items),
  });
  throwIfError(error);
  return data as Dispatch;
}

export async function transitionDispatchStatus(
  dispatchId: string,
  action: DispatchAction,
  notes?: string,
): Promise<Dispatch> {
  const { data, error } = await supabase.rpc("transition_dispatch_status", {
    p_dispatch_id: dispatchId,
    p_action: action,
    p_notes: notes ?? null,
  });
  throwIfError(error);
  return data as Dispatch;
}

/** Flujo directo (borrador → despachado en un paso vía RPC legacy). */
export async function createDispatchCompleted(
  header: NewDispatchHeader,
  items: DispatchLineItem[],
): Promise<Dispatch> {
  const { data, error } = await supabase.rpc("create_dispatch_with_items", {
    p_client_id: header.client_id,
    p_dispatch_date: header.dispatch_date,
    p_driver: header.driver ?? "",
    p_vehicle: header.vehicle ?? "",
    p_notes: header.notes ?? "",
    p_items: mapItems(items),
  });
  throwIfError(error);
  return data as Dispatch;
}

export async function fetchDispatchDashboardStats(): Promise<DispatchDashboardStats> {
  const { data, error } = await supabase.rpc("get_dispatch_dashboard_stats");
  throwIfError(error);
  const raw = (data ?? {}) as Record<string, number>;
  return {
    dispatches_today: Number(raw.dispatches_today ?? 0),
    tons_dispatched_today: Number(raw.tons_dispatched_today ?? 0),
    pending: Number(raw.pending ?? 0),
    approved: Number(raw.approved ?? 0),
    cancelled: Number(raw.cancelled ?? 0),
  };
}
