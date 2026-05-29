import { supabase } from "@/integrations/supabase/client";

export type UnitType = "lbs" | "kg" | "ton" | "unidad";

export async function listClients() {
  const { data, error } = await supabase.from("clients").select("*").order("company");
  if (error) throw error; return data ?? [];
}
export async function listProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) throw error; return data ?? [];
}
export async function listSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error; return data ?? [];
}
export async function inventoryStock() {
  // Aggregate from inventory_movements
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("product_id, movement_type, quantity, weight");
  if (error) throw error;
  const map = new Map<string, { qty: number; weight: number }>();
  for (const m of data ?? []) {
    const cur = map.get(m.product_id) ?? { qty: 0, weight: 0 };
    const sign = m.movement_type === "in" ? 1 : -1;
    cur.qty += sign * Number(m.quantity);
    cur.weight += sign * Number(m.weight);
    map.set(m.product_id, cur);
  }
  return map;
}
