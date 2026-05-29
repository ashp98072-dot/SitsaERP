import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import {
  getSupabaseStorageKey,
  logSupabaseEnvValidation,
  validateSupabaseEnvironment,
} from "@/lib/supabase-config";
import { isAuthDebugEnabled } from "@/lib/auth-errors";
import type { Database } from "./database-extensions";

function createSupabaseClient() {
  const validation = validateSupabaseEnvironment();
  if (!validation.ok) {
    const message = `Supabase mal configurado: ${validation.issues.join(" ")}`;
    console.error("[Supabase]", validation);
    throw new Error(message);
  }

  const SUPABASE_URL = getSupabaseUrl()!;
  const SUPABASE_ANON_KEY = getSupabaseAnonKey()!;

  if (isAuthDebugEnabled()) {
    logSupabaseEnvValidation();
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: getSupabaseStorageKey(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
