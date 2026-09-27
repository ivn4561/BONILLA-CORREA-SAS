import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { actorOf, requireApi } from "@/lib/auth";
import { filtersFromParams, queryAuditAll } from "@/lib/audit-query";
import { toCsv, toPdf } from "@/lib/export";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";

export const maxDuration = 60;

export async function GET(req: Request) {
  const s = await requireApi({ admin: true });
  if (s instanceof NextResponse) return s;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const filters = filtersFromParams(url.searchParams);
  const rows = await queryAuditAll(filters);

  const { data: v } = await supabaseAdmin().rpc("verify_audit_chain");
  const check = (v as { ok: boolean; message: string }[] | null)?.[0];
  const integrity = check ? `${check.ok ? "OK" : "FALLA"} - ${check.message}` : "no verificada";

  const body = format === "csv"
    ? Buffer.from(toCsv(rows), "utf8")
    : Buffer.from(await toPdf(rows, { filters, generatedBy: s.user.email!, integrity }));
  const sha256 = createHash("sha256").update(body).digest("hex");

  // El hash del archivo queda en el registro: el auditor puede comprobar que su copia no fue alterada.
  await logEvent({
    action: "registro_exportado",
    actor: actorOf(s),
    sessionId: s.sessionId,
    details: { formato: format, filas: rows.length, filtros: filters, sha256_archivo: sha256, integridad: integrity },
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/pdf",
      "Content-Disposition": `attachment; filename="registro-actividad-${stamp}.${format}"`,
      "Cache-Control": "no-store",
      "X-File-SHA256": sha256,
    },
  });
}
