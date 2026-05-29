import { supabase } from "@/integrations/supabase/client";
import type { SupplierMinimal } from "@/types";
import { throwIfError } from "./base";

export async function fetchSupplierMinimals(): Promise<SupplierMinimal[]> {
  const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
  throwIfError(error);
  return data ?? [];
}
