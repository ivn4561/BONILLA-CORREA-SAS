import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { actionLabel } from "@/lib/actions";
import { brand, formatDateTime, formatDateTimeTz, APP_TIMEZONE } from "@/lib/brand";
import { detailsSummary, locationOf, type AuditFilters, type AuditRow } from "@/lib/audit-query";

const COLUMNS = [
  "id", "fecha_hora_utc", `fecha_hora_${APP_TIMEZONE}`, "usuario", "rol", "accion", "accion_descripcion", "documento_id", "documento",
  "ip", "ciudad", "region", "pais", "navegador", "sistema", "dispositivo", "user_agent", "sesion", "detalles_json", "hash_anterior", "hash",
];

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita inyección de fórmulas al abrir en Excel
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: AuditRow[]): string {
  const lines = [COLUMNS.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.occurred_at, formatDateTime(r.occurred_at), r.user_email, r.user_role, r.action, actionLabel(r.action), r.document_id,
      r.document_name, r.ip, r.city, r.region, r.country, r.browser, r.os, r.device, r.user_agent, r.session_id, r.details, r.prev_hash, r.hash,
    ].map(csvCell).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** pdf-lib con fuentes estándar solo admite WinAnsi: se reemplazan caracteres no representables. */
function winAnsi(s: string): string {
  return s.normalize("NFC").replace(/[→]/g, "->").replace(/[—–]/g, "-").replace(/[^\x20-\x7E -ÿ€]/g, "?");
}

function fit(text: string, font: PDFFont, size: number, width: number): string {
  let t = winAnsi(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > width) t = t.slice(0, -1);
  return t + "…";
}

export async function toPdf(rows: AuditRow[], meta: { filters: AuditFilters; generatedBy: string; integrity: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Registro de actividad - ${brand.roomName}`);
  pdf.setAuthor(brand.orgName);
  pdf.setCreator(brand.roomName);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const W = 841.89, H = 595.28, M = 28; // A4 horizontal
  const cols = [
    { h: "#", w: 34 }, { h: "Fecha y hora", w: 92 }, { h: "Usuario", w: 120 }, { h: "Acción", w: 118 }, { h: "Documento", w: 130 },
    { h: "IP", w: 74 }, { h: "Ubicación", w: 84 }, { h: "Navegador / dispositivo", w: 86 }, { h: "Hash", w: 48 },
  ];
  const rowH = 11, fs = 6.6;
  const navy = rgb(0.1, 0.153, 0.267), gold = rgb(0.79, 0.66, 0.3), grey = rgb(0.45, 0.45, 0.5);
  let page!: PDFPage;
  let y = 0;

  const header = (first: boolean) => {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: navy });
    page.drawText(winAnsi(`${brand.orgName} · ${brand.roomName}`), { x: M, y: H - 26, size: 9, font: bold, color: navy });
    page.drawText("Registro de actividad", { x: M, y: H - 42, size: 15, font: bold, color: navy });
    y = H - 56;
    if (first) {
      const f = meta.filters;
      const filt = [f.user && `usuario contiene "${f.user}"`, f.document && `documento "${f.document}"`, f.action && `acción ${actionLabel(f.action)}`,
        f.from && `desde ${f.from}`, f.to && `hasta ${f.to}`].filter(Boolean).join(", ") || "sin filtros (registro completo)";
      for (const line of [
        `Generado: ${formatDateTimeTz(new Date())} por ${meta.generatedBy}`,
        `Filtros: ${filt}`,
        `Registros incluidos: ${rows.length}`,
        `Integridad de la cadena de hashes: ${meta.integrity}`,
      ]) {
        page.drawText(fit(line, font, 8, W - 2 * M), { x: M, y, size: 8, font, color: grey });
        y -= 11;
      }
      y -= 4;
    }
    let x = M;
    page.drawRectangle({ x: M, y: y - 3, width: W - 2 * M, height: 13, color: navy });
    for (const c of cols) {
      page.drawText(winAnsi(c.h), { x: x + 2, y: y + 1, size: 7, font: bold, color: rgb(1, 1, 1) });
      x += c.w;
    }
    y -= rowH + 3;
  };

  header(true);
  rows.forEach((r, i) => {
    if (y < M + 20) header(false);
    if (i % 2 === 0) page.drawRectangle({ x: M, y: y - 3, width: W - 2 * M, height: rowH, color: rgb(0.965, 0.96, 0.945) });
    const detail = detailsSummary(r);
    const values = [
      String(r.id), formatDateTime(r.occurred_at), r.user_email ?? "—", actionLabel(r.action) + (detail ? ` (${detail})` : ""),
      r.document_name ?? "", r.ip ?? "", locationOf(r), [r.browser, r.device].filter(Boolean).join(" · "), r.hash.slice(0, 10),
    ];
    let x = M;
    values.forEach((v, j) => {
      const f = j === 8 ? mono : font;
      page.drawText(fit(v, f, fs, cols[j].w - 4), { x: x + 2, y, size: fs, font: f, color: navy });
      x += cols[j].w;
    });
    y -= rowH;
  });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 22 }, end: { x: W - M, y: 22 }, thickness: 0.5, color: gold });
    p.drawText(winAnsi(`Documento confidencial · Horas en ${APP_TIMEZONE} · Hash = SHA-256 encadenado (verificable en el CSV)`), { x: M, y: 12, size: 6.5, font, color: grey });
    p.drawText(`Página ${i + 1} de ${pages.length}`, { x: W - M - 60, y: 12, size: 6.5, font, color: grey });
  });
  return pdf.save();
}
