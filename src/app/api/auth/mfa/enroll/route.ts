import { NextResponse } from "next/server";
import { brand } from "@/lib/brand";
import { getSessionState } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { sameOrigin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "origen_no_permitido");
  const s = await getSessionState();
  if (s.stage !== "mfa_enroll") return jsonError(409, "No corresponde activar 2FA en este momento.");

  const supabase = await createSupabaseServer();
  // Quita inscripciones a medias (el usuario recargó la página, etc.).
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: `${brand.roomName} · ${brand.orgName}`,
    friendlyName: `totp-${Date.now()}`,
  });
  if (error || !data) return jsonError(500, "No se pudo iniciar la activación de 2FA.");
  return NextResponse.json({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
}
