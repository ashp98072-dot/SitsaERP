import { supabase } from "@/integrations/supabase/client";
import type { StockSnapshot } from "@/types";
import { throwIfError } from "./base";

export async function fetchInventoryStock(): Promise<Map<string, StockSnapshot>> {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("product_id, movement_type, quantity, weight");
  throwIfError(error);

  const stock = new Map<string, StockSnapshot>();
  for (const movement of data ?? []) {
    const current = stock.get(movement.product_id) ?? { qty: 0, weight: 0 };
    const sign = movement.movement_type === "in" ? 1 : -1;
    current.qty += sign * Number(movement.quantity);
    current.weight += sign * Number(movement.weight);
    stock.set(movement.product_id, current);
  }
  return stock;
}
