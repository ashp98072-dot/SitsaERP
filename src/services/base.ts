import type { PostgrestError } from "@supabase/supabase-js";

export function throwIfError(error: PostgrestError | null): void {
  if (error) throw error;
}
