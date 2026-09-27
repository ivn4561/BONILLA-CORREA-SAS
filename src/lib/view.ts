import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ViewSession = {
  id: string; user_id: string; document_id: string; started_at: string;
  last_seen_at: string; active_seconds: number; max_page: number; closed_at: string | null;
};

export async function getOwnView(viewId: string, userId: string): Promise<ViewSession | null> {
  const { data } = await supabaseAdmin().from("view_sessions").select("*").eq("id", viewId).eq("user_id", userId).maybeSingle();
  return (data as ViewSession | null) ?? null;
}
