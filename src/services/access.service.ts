import { supabase } from "@/integrations/supabase/client";
import { isValidEmailFormat, normalizeEmail, normalizeEmailDomain } from "@/utils/constants";
import { throwIfError } from "./base";

export type AllowedDomain = {
  id: string;
  domain: string;
  note: string | null;
  created_at: string;
};

export type AllowedEmail = {
  id: string;
  email: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
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
  const normalized = normalizeEmailDomain(domain);
  if (!normalized || normalized.includes("@")) {
    throw new Error("Dominio inválido. Ejemplo: grupo-sitsa.com");
  }

  const { error } = await supabase.from("allowed_email_domains").insert({ domain: normalized });
  throwIfError(error);
}

export async function deleteAllowedDomain(id: string): Promise<void> {
  const { error } = await supabase.from("allowed_email_domains").delete().eq("id", id);
  throwIfError(error);
}

export async function fetchAllowedEmails(): Promise<AllowedEmail[]> {
  const { data, error } = await supabase
    .from("allowed_emails")
    .select("id, email, note, created_at, created_by")
    .order("email");
  throwIfError(error);
  return data ?? [];
}

export async function createAllowedEmail(email: string, note?: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmailFormat(normalized)) {
    throw new Error("Correo inválido. Ejemplo: auditor@gmail.com");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("allowed_emails").insert({
    email: normalized,
    note: note?.trim() || null,
    created_by: user?.id ?? null,
  });
  throwIfError(error);
}

export async function deleteAllowedEmail(id: string): Promise<void> {
  const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
  throwIfError(error);
}
