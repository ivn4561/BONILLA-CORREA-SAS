import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, getSessionState } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRequestContext } from "@/lib/request-context";
import { logEvent } from "@/lib/audit";
import { logLoginSuccess, validatePassword } from "@/lib/login-flow";

const Body = z.object({ password: z.string().max(200) });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await getSessionState();
  if (s.stage !== "change_password" && s.stage !== "ok") return jsonError(409, "Complete primero la verificación.");

  const problem = validatePassword(body.password);
  if (problem) return jsonError(400, problem);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) {
    const msg = error.code === "same_password" ? "La nueva contraseña debe ser distinta de la actual." : "No se pudo cambiar la contraseña.";
    return jsonError(400, msg);
  }
  await supabaseAdmin().from("profiles").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("id", s.user!.id);

  const context = await getRequestContext(await headers());
  await logEvent({ action: "cambio_contrasena", actor: actorOf(s), context, sessionId: s.sessionId });
  if (s.stage === "change_password") await logLoginSuccess(s.profile!, s.sessionId, context);
  return NextResponse.json({ stage: "ok" });
}
