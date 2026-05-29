import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type AppRole = Enums["app_role"];
export type UnitType = Enums["unit_type"];
export type MovementType = Enums["movement_type"];

export type Client = Tables["clients"]["Row"];
export type ClientInsert = Tables["clients"]["Insert"];
export type ClientUpdate = Tables["clients"]["Update"];
export type ClientSummary = Pick<
  Client,
  "id" | "company" | "nit" | "address" | "contact_name" | "phone"
>;

export type Product = Tables["products"]["Row"];
export type ProductInsert = Tables["products"]["Insert"];
export type ProductUpdate = Tables["products"]["Update"];
export type ProductMinimal = Pick<Product, "id" | "code" | "name" | "unit">;
export type ProductChartRow = Pick<Product, "id" | "name" | "unit">;

export type Supplier = Tables["suppliers"]["Row"];
export type SupplierMinimal = Pick<Supplier, "id" | "name">;

type DispatchRow = Tables["dispatches"]["Row"];

/** Despacho con campos enterprise (migración 20260529210000). */
export type Dispatch = DispatchRow & {
  correlative?: string;
  destination?: string | null;
  logistics_notes?: string | null;
  warehouse_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  submitted_at?: string | null;
  dispatched_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
};
export type DispatchInsert = Tables["dispatches"]["Insert"];
export type DispatchItem = Tables["dispatch_items"]["Row"];
export type DispatchItemInsert = Tables["dispatch_items"]["Insert"];

export type WarehouseEntry = Tables["warehouse_entries"]["Row"];
export type WarehouseEntryInsert = Tables["warehouse_entries"]["Insert"];

export type InventoryMovement = Tables["inventory_movements"]["Row"];

export type StockSnapshot = { qty: number; weight: number };

export type DispatchLineItem = {
  product_id: string;
  quantity: number;
  weight: number;
  unit: UnitType;
  notes?: string;
};

export type NewDispatchHeader = {
  client_id: string;
  driver: string;
  vehicle: string;
  notes: string;
  dispatch_date: string;
  destination?: string;
  logistics_notes?: string;
  warehouse_id?: string | null;
};

export type Warehouse = {
  id: string;
  code: string;
  name: string;
  branch_name: string | null;
  is_default: boolean;
  active: boolean;
  created_at: string;
};

export type AuditLog = {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  warehouse_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
};
