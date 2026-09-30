import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ACTIVITY_COOKIE, readActivityValue } from "@/lib/session-cookie";
import { LEGAL_VERSION } from "@/lib/legal";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  role: "admin" | "auditor";
  active: boolean;
  access_until: string | null;
  must_change_password: boolean;
  created_at: string;
};

export type Stage = "anon" | "denied" | "mfa_enroll" | "mfa_verify" | "change_password" | "consent" | "ok";

export type SessionState = {
  stage: Stage;
  user: User | null;
  profile: Profile | null;
  sessionId: string | null;
  deniedReason?: "sin_perfil" | "revocado" | "vencido";
};

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabaseAdmin().from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile | null) ?? null;
}

/**
 * ¿Aceptó el usuario la versión vigente de los Términos y de la Política de datos?
 * La prueba de la autorización (Ley 1581 de 2012) vive en el registro inalterable.
 */
export async function hasCurrentConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("audit_log").select("id")
    .eq("user_id", userId).eq("action", "consentimiento_aceptado")
    .contains("details", { version: LEGAL_VERSION })
    .limit(1);
  if (error) throw new Error("No se pudo verificar la autorización de tratamiento de datos");
  return (data?.length ?? 0) > 0;
}

export function accessProblem(profile: Profile | null): SessionState["deniedReason"] | null {
  if (!profile) return "sin_perfil";
  if (!profile.active) return "revocado";
  if (profile.access_until && new Date(profile.access_until).getTime() <= Date.now()) return "vencido";
  return null;
}

/** Estado completo de la sesión: se evalúa en CADA página y en CADA API protegida. */
export async function getSessionState(): Promise<SessionState> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { stage: "anon", user: null, profile: null, sessionId: null };

  const activity = readActivityValue((await cookies()).get(ACTIVITY_COOKIE)?.value, env.sessionSecret);
  const sessionId = activity && activity.uid === user.id ? activity.sid : null;

  const profile = await getProfile(user.id);
  const problem = accessProblem(profile);
  if (problem) return { stage: "denied", user, profile, sessionId, deniedReason: problem };

  if (env.requireMfa) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      const stage = aal?.nextLevel === "aal2" ? "mfa_verify" : "mfa_enroll";
      return { stage, user, profile, sessionId };
    }
  }
  if (profile!.must_change_password) return { stage: "change_password", user, profile, sessionId };
  if (!(await hasCurrentConsent(user.id))) return { stage: "consent", user, profile, sessionId };
  return { stage: "ok", user, profile, sessionId };
}

export type ReadySession = SessionState & { stage: "ok"; user: User; profile: Profile };

/** Para páginas: redirige si la sesión no está completa. */
export async function requirePage(opts: { admin?: boolean } = {}): Promise<ReadySession> {
  const s = await getSessionState();
  if (s.stage === "anon") redirect("/login");
  if (s.stage === "denied") redirect(`/salir?motivo=${s.deniedReason}`);
  if (s.stage !== "ok") redirect("/login");
  if (opts.admin && s.profile!.role !== "admin") redirect("/documentos");
  return s as ReadySession;
}

/** Para APIs: devuelve la sesión o una respuesta de error. */
export async function requireApi(opts: { admin?: boolean } = {}): Promise<ReadySession | NextResponse> {
  const s = await getSessionState();
  if (s.stage !== "ok") {
    return NextResponse.json({ error: "no_autorizado", stage: s.stage }, { status: 401 });
  }
  if (opts.admin && s.profile!.role !== "admin") {
    return NextResponse.json({ error: "prohibido" }, { status: 403 });
  }
  return s as ReadySession;
}

export function actorOf(s: SessionState) {
  return { id: s.user?.id ?? null, email: s.user?.email ?? s.profile?.email ?? null, role: s.profile?.role ?? null };
}

/** Rechaza peticiones que cambian estado si no vienen de este mismo origen (defensa CSRF). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  if (!origin) return site === "same-origin";
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
