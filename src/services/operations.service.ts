import { supabase } from "@/integrations/supabase/client";
import type { Dispatch, DispatchLineItem, NewDispatchHeader, UnitType, WarehouseEntry } from "@/types";
import { throwIfError } from "./base";

export type RegisterEntryPayload = {
  product_id: string;
  supplier_id: string | null;
  quantity: number;
  weight: number;
  unit: UnitType;
  entry_date: string;
  notes: string | null;
};

export async function registerWarehouseEntryRpc(
  payload: RegisterEntryPayload,
): Promise<WarehouseEntry> {
  const { data, error } = await supabase.rpc("register_warehouse_entry", {
    p_product_id: payload.product_id,
    p_supplier_id: payload.supplier_id,
    p_quantity: payload.quantity,
    p_weight: payload.weight,
    p_unit: payload.unit,
    p_entry_date: payload.entry_date,
    p_notes: payload.notes,
  });
  throwIfError(error);
  return data as WarehouseEntry;
}

export async function createDispatchWithItemsRpc(
  header: NewDispatchHeader,
  items: DispatchLineItem[],
): Promise<Dispatch> {
  const { data, error } = await supabase.rpc("create_dispatch_with_items", {
    p_client_id: header.client_id,
    p_dispatch_date: header.dispatch_date,
    p_driver: header.driver ?? "",
    p_vehicle: header.vehicle ?? "",
    p_notes: header.notes ?? "",
    p_items: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      weight: item.weight,
      unit: item.unit,
      notes: item.notes ?? null,
    })),
  });
  throwIfError(error);
  return data as Dispatch;
}
