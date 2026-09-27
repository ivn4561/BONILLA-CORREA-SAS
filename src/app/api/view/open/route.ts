import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, requireApi } from "@/lib/auth";
import { getViewableDocument } from "@/lib/docs";
import { viewKind } from "@/lib/docs/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";
import { getRequestContext } from "@/lib/request-context";
import { APP_TIMEZONE, formatDateTime } from "@/lib/brand";

const Body = z.object({ documentId: z.string().min(1).max(300) });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  const doc = await getViewableDocument(body.documentId);
  if (!doc) return jsonError(404, "Documento no disponible.");

  const viewId = randomUUID();
  const { error } = await supabaseAdmin().from("view_sessions").insert({ id: viewId, user_id: s.user.id, document_id: doc.id });
  if (error) return jsonError(500, "No se pudo abrir el documento.");

  const context = await getRequestContext(await headers());
  // Sin registro no hay acceso: si falla el log, logEvent lanza y el visor no recibe nada.
  await logEvent({
    action: "documento_abierto",
    actor: actorOf(s),
    documentId: doc.id,
    documentName: `${doc.folder_path ? doc.folder_path + "/" : ""}${doc.name}`,
    sessionId: s.sessionId,
    context,
    details: { view_id: viewId, tipo: doc.mime_type },
  });

  return NextResponse.json({
    viewId,
    kind: viewKind(doc.mime_type),
    name: doc.name,
    watermark: { email: s.user.email, ip: context.ip, stamp: `${formatDateTime(new Date())} ${APP_TIMEZONE}` },
  });
}
