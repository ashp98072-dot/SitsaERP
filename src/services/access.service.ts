import { supabase } from "@/integrations/supabase/client";
import { throwIfError } from "./base";

export type AllowedDomain = {
  id: string;
  domain: string;
  note: string | null;
  created_at: string;
};

export async function fetchAllowedDomains(): Promise<AllowedDomain[]> {
  const { data, error } = await supabase
    .from("allowed_email_domains")
    .select("id, domain, note, created_at")
    .order("domain");
  throwIfError(error);
  return data ?? [];
}

export async function createAllowedDomain(domain: string): Promise<void> {
  const { error } = await supabase
    .from("allowed_email_domains")
    .insert({ domain: domain.toLowerCase().trim() });
  throwIfError(error);
}

export async function deleteAllowedDomain(id: string): Promise<void> {
  const { error } = await supabase.from("allowed_email_domains").delete().eq("id", id);
  throwIfError(error);
}
