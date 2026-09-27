import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, requireApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";
import { getOwnView } from "@/lib/view";

const Body = z.object({ viewId: z.string().uuid(), activeSeconds: z.number().int().min(0).max(120).default(0) });

/** Cierre del documento (se envía con sendBeacon al salir). Registra la duración. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  const view = await getOwnView(body.viewId, s.user.id);
  if (!view) return jsonError(404, "Visualización no encontrada.");
  if (view.closed_at) return NextResponse.json({ ok: true });

  const now = new Date();
  const active = view.active_seconds + body.activeSeconds;
  await supabaseAdmin().from("view_sessions")
    .update({ active_seconds: active, last_seen_at: now.toISOString(), closed_at: now.toISOString() }).eq("id", view.id);
  const { data: doc } = await supabaseAdmin().from("documents").select("name, folder_path").eq("id", view.document_id).single();
  await logEvent({
    action: "documento_cerrado",
    actor: actorOf(s),
    documentId: view.document_id,
    documentName: doc ? `${doc.folder_path ? doc.folder_path + "/" : ""}${doc.name}` : null,
    sessionId: s.sessionId,
    details: {
      view_id: view.id,
      segundos_visible: active,
      segundos_totales: Math.round((now.getTime() - new Date(view.started_at).getTime()) / 1000),
      pagina_maxima: view.max_page,
    },
  });
  return NextResponse.json({ ok: true });
}
