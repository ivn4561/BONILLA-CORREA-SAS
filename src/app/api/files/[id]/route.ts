import { NextResponse } from "next/server";
import { actorOf, requireApi } from "@/lib/auth";
import { docSource, getViewableDocument } from "@/lib/docs";
import { GOOGLE_NATIVE, viewKind } from "@/lib/docs/types";
import { cachedExport } from "@/lib/pdf-cache";
import { logEvent } from "@/lib/audit";

const MAX_CHUNK = 2 * 1024 * 1024; // < 4,5 MB (límite de respuesta de las funciones de Vercel)
const MAX_IMAGE = 4 * 1024 * 1024;

const baseHeaders = {
  "Content-Type": "application/octet-stream", // nunca un tipo que el navegador abra por sí solo
  "Content-Disposition": "inline",
  "Cache-Control": "no-store, private, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Entrega bytes SOLO al visor. Si alguien abre la URL directamente en el navegador,
 * falta la cabecera X-Viewer y se registra el intento.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const doc = await getViewableDocument(id);
  if (!doc) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });

  const dest = req.headers.get("sec-fetch-dest");
  if (req.headers.get("x-viewer") !== "1" || (dest && dest !== "empty")) {
    await logEvent({
      action: "acceso_directo_bloqueado",
      actor: actorOf(s),
      documentId: doc.id,
      documentName: doc.name,
      sessionId: s.sessionId,
      details: { sec_fetch_dest: dest },
    });
    return NextResponse.json({ error: "acceso_directo_no_permitido" }, { status: 403 });
  }

  const kind = viewKind(doc.mime_type);
  const src = docSource();

  if (kind === "image") {
    const size = doc.size_bytes ?? (await src.size(id));
    if (size > MAX_IMAGE) return NextResponse.json({ error: "imagen_demasiado_grande" }, { status: 413 });
    const buf = await src.read(id);
    return new NextResponse(new Uint8Array(buf), { headers: { ...baseHeaders, "Content-Length": String(buf.length) } });
  }
  if (kind !== "pdf") return NextResponse.json({ error: "tipo_no_servible" }, { status: 415 });

  // PDF: siempre por rangos para no superar el límite de tamaño de respuesta.
  const exported = GOOGLE_NATIVE.has(doc.mime_type) ? await cachedExport(id, () => src.exportPdf(id)) : null;
  const total = exported ? exported.length : doc.size_bytes ?? (await src.size(id));

  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.get("range") ?? "");
  const start = m ? Number(m[1]) : 0;
  const requestedEnd = m && m[2] ? Number(m[2]) : total - 1;
  const end = Math.min(requestedEnd, start + MAX_CHUNK - 1, total - 1);
  if (start >= total || end < start) {
    return new NextResponse(null, { status: 416, headers: { ...baseHeaders, "Content-Range": `bytes */${total}` } });
  }
  const chunk = exported ? exported.subarray(start, end + 1) : await src.read(id, { start, end });
  const partial = !!m || end < total - 1;
  return new NextResponse(new Uint8Array(chunk), {
    status: partial ? 206 : 200,
    headers: {
      ...baseHeaders,
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunk.length),
      ...(partial ? { "Content-Range": `bytes ${start}-${start + chunk.length - 1}/${total}` } : {}),
      "X-Total-Length": String(total),
    },
  });
}
