import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types";
import { throwIfError } from "./base";

export async function validateEmailAccess(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_email_allowed", { _email: email });
  if (error) return true;
  return data !== false;
}

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((row) => row.role);
}
