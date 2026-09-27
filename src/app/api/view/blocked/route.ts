import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, requireApi } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { getOwnView } from "@/lib/view";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Body = z.object({ viewId: z.string().uuid(), what: z.enum(["imprimir", "guardar", "copiar", "clic_derecho", "captura", "herramientas_dev"]) });

/** Registra intentos de imprimir/guardar/copiar dentro del visor. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  const view = await getOwnView(body.viewId, s.user.id);
  if (!view) return jsonError(404, "Visualización no encontrada.");
  const { data: doc } = await supabaseAdmin().from("documents").select("name, folder_path").eq("id", view.document_id).single();
  await logEvent({
    action: "intento_copia",
    documentName: doc ? `${doc.folder_path ? doc.folder_path + "/" : ""}${doc.name}` : null,
    actor: actorOf(s),
    documentId: view.document_id,
    sessionId: s.sessionId,
    details: { view_id: view.id, intento: body.what },
  });
  return NextResponse.json({ ok: true });
}
