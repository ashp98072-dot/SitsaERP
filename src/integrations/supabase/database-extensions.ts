import type { Database as GeneratedDatabase } from "./types";

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
    };
  };
};
