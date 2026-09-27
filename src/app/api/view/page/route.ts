import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, requireApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";
import { getOwnView } from "@/lib/view";

const Body = z.object({ viewId: z.string().uuid(), page: z.number().int().min(1).max(100000), total: z.number().int().min(1).max(100000) });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  const view = await getOwnView(body.viewId, s.user.id);
  if (!view || view.closed_at) return jsonError(404, "Visualización no encontrada.");

  const { data: doc } = await supabaseAdmin().from("documents").select("name, folder_path").eq("id", view.document_id).single();
  await supabaseAdmin().from("view_sessions")
    .update({ max_page: Math.max(view.max_page, body.page), last_seen_at: new Date().toISOString() }).eq("id", view.id);
  await logEvent({
    action: "pagina_vista",
    actor: actorOf(s),
    documentId: view.document_id,
    documentName: doc ? `${doc.folder_path ? doc.folder_path + "/" : ""}${doc.name}` : null,
    sessionId: s.sessionId,
    details: { view_id: view.id, pagina: body.page, de: body.total },
  });
  return NextResponse.json({ ok: true });
}
