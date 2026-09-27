import { NextResponse } from "next/server";
import { actorOf, requireApi, sameOrigin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { syncDocuments } from "@/lib/docs/sync";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "origen_no_permitido");
  const s = await requireApi({ admin: true });
  if (s instanceof NextResponse) return s;
  try {
    return NextResponse.json(await syncDocuments(actorOf(s)));
  } catch (e) {
    console.error(e);
    return jsonError(502, "No se pudo leer la carpeta de documentos. Revise la configuración de Google Drive.");
  }
}
