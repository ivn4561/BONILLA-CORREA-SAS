import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, requireApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";

const Body = z.object({ visible: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi({ admin: true });
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: doc } = await db.from("documents").select("*").eq("id", id).maybeSingle();
  if (!doc || doc.removed) return jsonError(404, "Documento no encontrado.");
  if (doc.visible === body.visible) return NextResponse.json({ ok: true });
  await db.from("documents").update({ visible: body.visible }).eq("id", id);
  await logEvent({
    action: body.visible ? "admin_documento_publicado" : "admin_documento_ocultado",
    actor: actorOf(s),
    sessionId: s.sessionId,
    documentId: id,
    documentName: `${doc.folder_path ? doc.folder_path + "/" : ""}${doc.name}`,
  });
  return NextResponse.json({ ok: true });
}
