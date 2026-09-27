import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/audit";
import type { Profile, Stage } from "@/lib/auth";
import type { RequestContext } from "@/lib/request-context";

export const MAX_FAILS_PER_EMAIL = 5;
export const MAX_FAILS_PER_IP = 20;
export const FAIL_WINDOW_MIN = 15;

/** Etapa siguiente del inicio de sesión para un usuario cuya contraseña ya se validó. */
export async function nextStage(supabase: SupabaseClient, profile: Profile): Promise<Stage> {
  if (env.requireMfa) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return aal?.nextLevel === "aal2" ? "mfa_verify" : "mfa_enroll";
  }
  return profile.must_change_password ? "change_password" : "ok";
}

export async function logLoginSuccess(profile: Profile, sessionId: string | null, context: RequestContext) {
  await logEvent({
    action: "login_exitoso",
    actor: { id: profile.id, email: profile.email, role: profile.role },
    sessionId,
    context,
    details: { mfa: env.requireMfa },
  });
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Debe incluir mayúsculas, minúsculas y números.";
  return null;
}
