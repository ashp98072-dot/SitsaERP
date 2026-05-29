import type { UnitType } from "./domain";

export type StockAlertLevel = "ok" | "bajo" | "critico" | "agotado";

export type InventoryStockRow = {
  product_id: string;
  code: string;
  name: string;
  category: string | null;
  unit: UnitType;
  min_stock: number;
  active: boolean;
  stock_quantity: number;
  stock_weight: number;
  alert_level: StockAlertLevel;
};

export type KardexMovementKind =
  | "ingreso_bodega"
  | "despacho"
  | "ajuste_manual"
  | "correccion"
  | "devolucion"
  | "entrada"
  | "salida";

export type KardexRow = {
  movement_id: string;
  product_id: string;
  created_at: string;
  movement_kind: KardexMovementKind | string;
  movement_type: "in" | "out";
  qty_in: number;
  qty_out: number;
  weight_in: number;
  weight_out: number;
  unit: UnitType;
  balance_qty: number;
  balance_weight: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
};

export type InventoryAdjustment = {
  id: string;
  product_id: string;
  direction: "increase" | "decrease";
  quantity: number;
  weight: number;
  unit: UnitType;
  reason: string;
  movement_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type InventoryDashboardStats = {
  total_tons: number;
  products_critical: number;
  products_low: number;
  products_out: number;
  movements_today: number;
  entries_today: number;
  dispatches_today: number;
};

export const KARDEX_KIND_LABELS: Record<string, string> = {
  ingreso_bodega: "Ingreso bodega",
  despacho: "Despacho",
  ajuste_manual: "Ajuste manual",
  correccion: "Corrección",
  devolucion: "Devolución",
  entrada: "Entrada",
  salida: "Salida",
};
