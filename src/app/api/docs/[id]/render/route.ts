import { NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { docSource, getViewableDocument } from "@/lib/docs";
import { viewKind } from "@/lib/docs/types";
import { docxToHtml, textToHtml, xlsxToHtml } from "@/lib/convert";

const MAX_BYTES = 15 * 1024 * 1024;

/** Convierte Word/Excel/texto a HTML de solo lectura en el servidor. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireApi();
  if (s instanceof NextResponse) return s;
  if (req.headers.get("x-viewer") !== "1") return NextResponse.json({ error: "acceso_directo_no_permitido" }, { status: 403 });
  const { id } = await params;
  const doc = await getViewableDocument(id);
  if (!doc) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });
  if ((doc.size_bytes ?? 0) > MAX_BYTES) return NextResponse.json({ error: "archivo_demasiado_grande" }, { status: 413 });

  const kind = viewKind(doc.mime_type);
  const buf = await docSource().read(id);
  const headers = { "Cache-Control": "no-store, private" };
  if (kind === "docx") return NextResponse.json({ kind, html: await docxToHtml(buf) }, { headers });
  if (kind === "xlsx") return NextResponse.json({ kind, sheets: await xlsxToHtml(buf) }, { headers });
  if (kind === "text") return NextResponse.json({ kind, html: textToHtml(buf) }, { headers });
  return NextResponse.json({ error: "tipo_no_convertible" }, { status: 415 });
}
