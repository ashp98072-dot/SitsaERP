import { supabase } from "@/integrations/supabase/client";
import type { DispatchTimelineEntry } from "@/types/dispatch";
import { throwIfError } from "../base";

export async function fetchDispatchTimeline(dispatchId: string): Promise<DispatchTimelineEntry[]> {
  const { data, error } = await supabase
    .from("dispatch_timeline")
    .select("*")
    .eq("dispatch_id", dispatchId)
    .order("created_at", { ascending: true });
  throwIfError(error);
  return (data ?? []) as DispatchTimelineEntry[];
}
