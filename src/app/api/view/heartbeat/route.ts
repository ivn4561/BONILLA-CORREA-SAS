import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { requireApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOwnView } from "@/lib/view";

const Body = z.object({ viewId: z.string().uuid(), activeSeconds: z.number().int().min(0).max(120) });

/** Latido del visor: acumula el tiempo con la pestaña visible. No renueva la inactividad. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  const view = await getOwnView(body.viewId, s.user.id);
  if (!view || view.closed_at) return jsonError(404, "Visualización no encontrada.");
  await supabaseAdmin().from("view_sessions").update({
    active_seconds: view.active_seconds + body.activeSeconds,
    last_seen_at: new Date().toISOString(),
  }).eq("id", view.id);
  return NextResponse.json({ ok: true });
}
