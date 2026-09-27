import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, getSessionState } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRequestContext } from "@/lib/request-context";
import { logEvent } from "@/lib/audit";
import { FAIL_WINDOW_MIN, MAX_FAILS_PER_EMAIL, logLoginSuccess, nextStage } from "@/lib/login-flow";

const Body = z.object({ code: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos"), factorId: z.string().optional() });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await getSessionState();
  if (s.stage !== "mfa_verify" && s.stage !== "mfa_enroll") return jsonError(409, "No hay verificación pendiente.");
  const context = await getRequestContext(await headers());
  const actor = actorOf(s);

  const { data: rate } = await supabaseAdmin().rpc("recent_failed_logins", {
    p_email: actor.email ?? "", p_ip: context.ip ?? "", p_minutes: FAIL_WINDOW_MIN,
  });
  const counts = (rate as { by_email: number }[] | null)?.[0];
  if (counts && counts.by_email >= MAX_FAILS_PER_EMAIL) {
    await logEvent({ action: "login_bloqueado", actor, context, sessionId: s.sessionId, details: { etapa: "2fa" } });
    return jsonError(429, "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo.");
  }

  const supabase = await createSupabaseServer();
  let factorId = body.factorId;
  if (s.stage === "mfa_verify") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    factorId = factors?.totp?.find((f) => f.status === "verified")?.id;
  }
  if (!factorId) return jsonError(400, "Factor 2FA no encontrado.");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: body.code });
  if (error) {
    await logEvent({ action: "mfa_fallido", actor, context, sessionId: s.sessionId, details: { etapa: s.stage } });
    return jsonError(401, "Código incorrecto o vencido.");
  }
  if (s.stage === "mfa_enroll") {
    await logEvent({ action: "mfa_activado", actor, context, sessionId: s.sessionId });
  }
  const stage = await nextStage(supabase, s.profile!);
  if (stage === "ok") await logLoginSuccess(s.profile!, s.sessionId, context);
  return NextResponse.json({ stage });
}
