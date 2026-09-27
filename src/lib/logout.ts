import "server-only";
import { cookies } from "next/headers";
import { actorOf, getSessionState } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { logEvent } from "@/lib/audit";
import { ACTIVITY_COOKIE } from "@/lib/session-cookie";

export async function performLogout(motivo: string) {
  const s = await getSessionState();
  if (s.user) {
    try {
      await logEvent({ action: "cierre_sesion", actor: actorOf(s), sessionId: s.sessionId, details: { motivo } });
    } finally {
      const supabase = await createSupabaseServer();
      await supabase.auth.signOut({ scope: "local" });
    }
  }
  (await cookies()).delete(ACTIVITY_COOKIE);
}
