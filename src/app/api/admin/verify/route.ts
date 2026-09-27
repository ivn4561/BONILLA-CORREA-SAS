import { NextResponse } from "next/server";
import { actorOf, requireApi, sameOrigin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "origen_no_permitido");
  const s = await requireApi({ admin: true });
  if (s instanceof NextResponse) return s;
  const { data, error } = await supabaseAdmin().rpc("verify_audit_chain");
  if (error) return jsonError(500, "No se pudo verificar.");
  const r = (data as { ok: boolean; total: number; first_bad_id: number | null; message: string }[])[0];
  await logEvent({ action: "integridad_verificada", actor: actorOf(s), sessionId: s.sessionId, details: { resultado: r.message, ok: r.ok } });
  return NextResponse.json(r);
}
