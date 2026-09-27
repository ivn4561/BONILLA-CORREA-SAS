import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { readBody, jsonError } from "@/lib/http";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRequestContext } from "@/lib/request-context";
import { logEvent } from "@/lib/audit";
import { accessProblem, getProfile } from "@/lib/auth";
import { ACTIVITY_COOKIE, activityCookieOptions, createActivityValue, readActivityValue } from "@/lib/session-cookie";
import { FAIL_WINDOW_MIN, MAX_FAILS_PER_EMAIL, MAX_FAILS_PER_IP, logLoginSuccess, nextStage } from "@/lib/login-flow";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const context = await getRequestContext(await headers());

  const { data: rate } = await supabaseAdmin().rpc("recent_failed_logins", {
    p_email: body.email, p_ip: context.ip ?? "", p_minutes: FAIL_WINDOW_MIN,
  });
  const counts = (rate as { by_email: number; by_ip: number }[] | null)?.[0];
  if (counts && (counts.by_email >= MAX_FAILS_PER_EMAIL || counts.by_ip >= MAX_FAILS_PER_IP)) {
    await logEvent({ action: "login_bloqueado", actor: { id: null, email: body.email }, context, details: { ...counts } });
    return jsonError(429, "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo.");
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
  if (error?.code === "user_banned") {
    await logEvent({ action: "acceso_denegado", actor: { id: null, email: body.email }, context, details: { motivo: "revocado" } });
    return jsonError(403, "Su acceso no está habilitado. Contacte al administrador.");
  }
  if (error || !data.user) {
    await logEvent({
      action: "login_fallido",
      actor: { id: null, email: body.email },
      context,
      details: { motivo: error?.code ?? error?.message ?? "desconocido" },
    });
    return jsonError(401, "Correo o contraseña incorrectos.");
  }

  const profile = await getProfile(data.user.id);
  const problem = accessProblem(profile);
  if (problem) {
    await supabase.auth.signOut();
    await logEvent({
      action: "acceso_denegado",
      actor: { id: data.user.id, email: body.email, role: profile?.role },
      context,
      details: { motivo: problem },
    });
    const msg = problem === "vencido" ? "Su periodo de acceso ha finalizado." : "Su acceso no está habilitado. Contacte al administrador.";
    return jsonError(403, msg);
  }

  const activity = createActivityValue(data.user.id, env.sessionSecret);
  (await cookies()).set(ACTIVITY_COOKIE, activity, activityCookieOptions);
  const sid = readActivityValue(activity, env.sessionSecret)!.sid;

  const stage = await nextStage(supabase, profile!);
  if (stage === "ok") {
    await logLoginSuccess(profile!, sid, context);
  } else {
    await logEvent({
      action: "login_paso_contrasena",
      actor: { id: profile!.id, email: profile!.email, role: profile!.role },
      sessionId: sid,
      context,
      details: { siguiente_paso: stage },
    });
  }
  return NextResponse.json({ stage });
}
