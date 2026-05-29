import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/database-extensions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { APP_ROLES } from "@/utils/constants";
import type { AppRole } from "@/types";

const ROLES = APP_ROLES;

export type AdminApiAction =
  | "list"
  | "create"
  | "setRole"
  | "setActive"
  | "resetPassword"
  | "delete";

async function assertAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "administrador")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Solo administradores pueden realizar esta acción");
  }
}

export async function verifyBearerToken(authorizationHeader: string | undefined): Promise<string> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase no configurado en el servidor");
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("No autorizado");
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("No autorizado");
  }

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new Error("No autorizado");
  }

  return data.user.id;
}

export async function handleAdminApi(
  action: AdminApiAction,
  payload: unknown,
  userId: string,
): Promise<unknown> {
  await assertAdmin(userId);

  switch (action) {
    case "list": {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const ids = (list?.users ?? []).map((user) => user.id);
      const emptyId = "00000000-0000-0000-0000-000000000000";
      const filterIds = ids.length ? ids : [emptyId];

      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").in("id", filterIds),
        supabaseAdmin.from("user_roles").select("*").in("user_id", filterIds),
      ]);

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const rolesByUser = new Map<string, AppRole[]>();
      for (const role of roles ?? []) {
        const current = rolesByUser.get(role.user_id) ?? [];
        current.push(role.role);
        rolesByUser.set(role.user_id, current);
      }

      return (list?.users ?? []).map((user) => ({
        id: user.id,
        email: user.email,
        full_name: profilesById.get(user.id)?.full_name ?? null,
        active: profilesById.get(user.id)?.active ?? true,
        roles: rolesByUser.get(user.id) ?? [],
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
      }));
    }

    case "create": {
      const data = z
        .object({
          email: z.string().email(),
          full_name: z.string().min(1).max(120),
          password: z.string().min(8).max(120),
          role: z.enum(ROLES),
        })
        .parse(payload);

      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      });
      if (error) throw new Error(error.message);

      const uid = created.user!.id;
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: uid, role: data.role });
      if (roleError) throw new Error(roleError.message);

      return { id: uid };
    }

    case "setRole": {
      const data = z
        .object({ user_id: z.string().uuid(), role: z.enum(ROLES) })
        .parse(payload);

      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "setActive": {
      const data = z
        .object({ user_id: z.string().uuid(), active: z.boolean() })
        .parse(payload);

      await supabaseAdmin
        .from("profiles")
        .update({
          active: data.active,
          disabled_at: data.active ? null : new Date().toISOString(),
        })
        .eq("id", data.user_id);

      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        ban_duration: data.active ? "none" : "876000h",
      } as { ban_duration: string });

      return { ok: true };
    }

    case "resetPassword": {
      const data = z
        .object({
          user_id: z.string().uuid(),
          password: z.string().min(8).max(120),
        })
        .parse(payload);

      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "delete": {
      const data = z.object({ user_id: z.string().uuid() }).parse(payload);
      if (data.user_id === userId) {
        throw new Error("No puedes eliminarte a ti mismo");
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    default:
      throw new Error("Acción no válida");
  }
}
