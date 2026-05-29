import { supabase } from "@/integrations/supabase/client";
import type { AdminApiAction } from "@/lib/admin-api-handler";
import { getErrorMessage } from "@/utils/errors";

export type AppUserRow = {
  id: string;
  email: string | undefined;
  full_name: string | null;
  active: boolean;
  roles: string[];
  last_sign_in_at: string | undefined;
  created_at: string;
};

async function callAdminApi<T>(action: AdminApiAction, data?: unknown): Promise<T> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Sesión requerida");
  }

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, data }),
  });

  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Error en operación de administración");
  }

  return body;
}

export async function listAppUsers(): Promise<AppUserRow[]> {
  return callAdminApi<AppUserRow[]>("list");
}

export async function createAppUser(data: unknown) {
  return callAdminApi<{ id: string }>("create", data);
}

export async function setUserRole(data: unknown) {
  return callAdminApi<{ ok: boolean }>("setRole", data);
}

export async function setUserActive(data: unknown) {
  return callAdminApi<{ ok: boolean }>("setActive", data);
}

export async function resetUserPassword(data: unknown) {
  return callAdminApi<{ ok: boolean }>("resetPassword", data);
}

export async function deleteAppUser(data: unknown) {
  return callAdminApi<{ ok: boolean }>("delete", data);
}

export function getAdminApiError(error: unknown): string {
  return getErrorMessage(error);
}
