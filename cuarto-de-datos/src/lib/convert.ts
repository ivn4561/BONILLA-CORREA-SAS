import "server-only";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import sanitize from "sanitize-html";

const MAX_ROWS = 3000;
const MAX_COLS = 80;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Limpieza con lista blanca: mammoth genera HTML a partir de la estructura del .docx,
 * pero igualmente solo se permiten etiquetas de formato, sin scripts, eventos ni enlaces.
 */
export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "sub", "sup",
      "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th", "img", "blockquote", "pre", "code", "span", "div", "a"],
    allowedAttributes: { img: ["src", "alt", "width", "height"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: [],
    allowedSchemesByTag: { img: ["data"] },
    transformTags: { a: "span" }, // sin enlaces salientes
  });
}

export async function docxToHtml(buf: Buffer): Promise<string> {
  const { value } = await mammoth.convertToHtml({ buffer: buf });
  return sanitizeHtml(value);
}

export type SheetHtml = { name: string; html: string; truncated: boolean };

export async function xlsxToHtml(buf: Buffer): Promise<SheetHtml[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheets: SheetHtml[] = [];
  wb.eachSheet((ws) => {
    if (ws.state && ws.state !== "visible") return;
    const rows = Math.min(ws.actualRowCount ? ws.rowCount : 0, MAX_ROWS);
    const cols = Math.min(ws.columnCount, MAX_COLS);
    const truncated = ws.rowCount > MAX_ROWS || ws.columnCount > MAX_COLS;
    let html = "<table><thead><tr><th></th>";
    for (let c = 1; c <= cols; c++) html += `<th>${columnName(c)}</th>`;
    html += "</tr></thead><tbody>";
    for (let r = 1; r <= rows; r++) {
      const row = ws.getRow(r);
      html += `<tr><th>${r}</th>`;
      for (let c = 1; c <= cols; c++) {
        const cell = row.getCell(c);
        const text = cellText(cell);
        const numeric = typeof cell.value === "number" || typeof cell.result === "number";
        html += `<td${numeric ? ' class="num"' : ""}${cell.font?.bold ? ' style="font-weight:600"' : ""}>${escapeHtml(text)}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    sheets.push({ name: ws.name, html, truncated });
  });
  return sheets;
}

/** Texto visible de la celda, respetando el formato numérico básico de Excel (miles, decimales, %, fechas). */
function cellText(cell: ExcelJS.Cell): string {
  const raw = cell.value;
  const value = raw && typeof raw === "object" && "result" in raw ? (raw as { result: unknown }).result : raw;
  const fmt = cell.numFmt ?? "";
  if (typeof value === "number") {
    const decimals = /0\.(0+)/.exec(fmt)?.[1].length ?? (Number.isInteger(value) ? 0 : 2);
    if (fmt.includes("%")) return `${(value * 100).toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;
    return value.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: /#,##|,0/.test(fmt) });
  }
  if (value instanceof Date) return value.toLocaleDateString("es-CO", { timeZone: "UTC" });
  try {
    return cell.text ?? "";
  } catch {
    return String(value ?? "");
  }
}

function columnName(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function textToHtml(buf: Buffer): string {
  return `<pre>${escapeHtml(buf.toString("utf8"))}</pre>`;
}
