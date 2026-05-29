import { analyzeSupabaseAnonKey } from "@/lib/supabase-config";

/** Resolves Supabase URL and anon key for client (Vite) and server. */
export function getSupabaseUrl(): string | undefined {
  const url =
    import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  return url?.trim().replace(/\/$/, "");
}

export function getSupabaseAnonKey(): string | undefined {
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return key?.trim();
}

export function warnIfMisconfiguredSupabaseKey(key: string | undefined): void {
  const info = analyzeSupabaseAnonKey(key);
  if (info.role === "service_role") {
    console.error(
      "[Supabase] VITE_SUPABASE_ANON_KEY es service_role. Usa la anon/public key en el frontend.",
    );
  }
}
