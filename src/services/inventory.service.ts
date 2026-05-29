import { supabase } from "@/integrations/supabase/client";
import type { StockSnapshot, UnitType } from "@/types";
import type {
  InventoryAdjustment,
  InventoryDashboardStats,
  InventoryStockRow,
  KardexRow,
} from "@/types/inventory";
import { throwIfError } from "./base";

export async function fetchInventoryStockEnriched(): Promise<InventoryStockRow[]> {
  const { data, error } = await supabase
    .from("product_stock_enriched")
    .select("*")
    .order("code", { ascending: true });
  throwIfError(error);
  return (data ?? []) as InventoryStockRow[];
}

/** Mapa de stock por producto (vista SQL, fuente única de verdad). */
export async function fetchInventoryStock(): Promise<Map<string, StockSnapshot>> {
  const { data, error } = await supabase
    .from("product_stock")
    .select("product_id, stock_quantity, stock_weight");
  throwIfError(error);

  const stock = new Map<string, StockSnapshot>();
  for (const row of data ?? []) {
    if (!row.product_id) continue;
    stock.set(row.product_id, {
      qty: Number(row.stock_quantity),
      weight: Number(row.stock_weight),
    });
  }
  return stock;
}

export async function fetchProductKardex(productId: string): Promise<KardexRow[]> {
  const { data, error } = await supabase
    .from("product_kardex")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as KardexRow[];
}

export async function fetchInventoryDashboardStats(): Promise<InventoryDashboardStats> {
  const { data, error } = await supabase.rpc("get_inventory_dashboard_stats");
  throwIfError(error);
  const raw = (data ?? {}) as Record<string, number>;
  return {
    total_tons: Number(raw.total_tons ?? 0),
    products_critical: Number(raw.products_critical ?? 0),
    products_low: Number(raw.products_low ?? 0),
    products_out: Number(raw.products_out ?? 0),
    movements_today: Number(raw.movements_today ?? 0),
    entries_today: Number(raw.entries_today ?? 0),
    dispatches_today: Number(raw.dispatches_today ?? 0),
  };
}

export type InventoryAdjustmentInput = {
  product_id: string;
  direction: "increase" | "decrease";
  quantity: number;
  weight: number;
  unit: UnitType;
  reason: string;
};

export async function registerInventoryAdjustment(
  payload: InventoryAdjustmentInput,
): Promise<InventoryAdjustment> {
  const { data, error } = await supabase.rpc("register_inventory_adjustment", {
    p_product_id: payload.product_id,
    p_direction: payload.direction,
    p_quantity: payload.quantity,
    p_weight: payload.weight,
    p_unit: payload.unit,
    p_reason: payload.reason,
  });
  throwIfError(error);
  return data as InventoryAdjustment;
}

export async function fetchInventoryAdjustments(limit = 50): Promise<InventoryAdjustment[]> {
  const { data, error } = await supabase
    .from("inventory_adjustments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfError(error);
  return (data ?? []) as InventoryAdjustment[];
}
