import type { Database as GeneratedDatabase, Json } from "./types";

/** RPCs and tables added by enterprise migrations (merge after `supabase gen types`). */
export type Database = GeneratedDatabase & {
  public: GeneratedDatabase["public"] & {
    Tables: GeneratedDatabase["public"]["Tables"] & {
      audit_logs: {
        Row: {
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
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          warehouse_id?: string | null;
          old_values?: Record<string, unknown> | null;
          new_values?: Record<string, unknown> | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          warehouse_id?: string | null;
          old_values?: Record<string, unknown> | null;
          new_values?: Record<string, unknown> | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      inventory_adjustments: {
        Row: {
          id: string;
          product_id: string;
          direction: string;
          quantity: number;
          weight: number;
          unit: GeneratedDatabase["public"]["Enums"]["unit_type"];
          reason: string;
          movement_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          direction: string;
          quantity: number;
          weight?: number;
          unit?: GeneratedDatabase["public"]["Enums"]["unit_type"];
          reason: string;
          movement_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          direction?: string;
          quantity?: number;
          weight?: number;
          unit?: GeneratedDatabase["public"]["Enums"]["unit_type"];
          reason?: string;
          movement_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          id: string;
          code: string;
          name: string;
          branch_name: string | null;
          is_default: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          branch_name?: string | null;
          is_default?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          branch_name?: string | null;
          is_default?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: GeneratedDatabase["public"]["Functions"] & {
      ensure_user_bootstrap: {
        Args: Record<string, never>;
        Returns: Json;
      };
      register_warehouse_entry: {
        Args: {
          p_product_id: string;
          p_supplier_id: string | null;
          p_quantity: number;
          p_weight: number;
          p_unit: GeneratedDatabase["public"]["Enums"]["unit_type"];
          p_entry_date: string;
          p_notes?: string | null;
        };
        Returns: GeneratedDatabase["public"]["Tables"]["warehouse_entries"]["Row"];
      };
      create_dispatch_with_items: {
        Args: {
          p_client_id: string;
          p_dispatch_date: string;
          p_driver: string;
          p_vehicle: string;
          p_notes: string;
          p_items: unknown;
        };
        Returns: GeneratedDatabase["public"]["Tables"]["dispatches"]["Row"];
      };
      register_inventory_adjustment: {
        Args: {
          p_product_id: string;
          p_direction: string;
          p_quantity: number;
          p_weight: number;
          p_unit: GeneratedDatabase["public"]["Enums"]["unit_type"];
          p_reason: string;
        };
        Returns: {
          id: string;
          product_id: string;
          direction: string;
          quantity: number;
          weight: number;
          unit: GeneratedDatabase["public"]["Enums"]["unit_type"];
          reason: string;
          movement_id: string | null;
          created_by: string | null;
          created_at: string;
        };
      };
      get_inventory_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Record<string, unknown>;
      };
    };
    Views: GeneratedDatabase["public"]["Views"] & {
      product_stock_enriched: {
        Row: {
          product_id: string;
          code: string;
          name: string;
          category: string | null;
          unit: GeneratedDatabase["public"]["Enums"]["unit_type"];
          min_stock: number;
          active: boolean;
          stock_quantity: number;
          stock_weight: number;
          alert_level: string;
        };
        Relationships: [];
      };
      product_kardex: {
        Row: {
          movement_id: string;
          product_id: string;
          created_at: string;
          movement_kind: string;
          movement_type: GeneratedDatabase["public"]["Enums"]["movement_type"];
          qty_in: number;
          qty_out: number;
          weight_in: number;
          weight_out: number;
          unit: GeneratedDatabase["public"]["Enums"]["unit_type"];
          balance_qty: number;
          balance_weight: number;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_by_email: string | null;
          created_by_name: string | null;
        };
        Relationships: [];
      };
    };
  };
};
