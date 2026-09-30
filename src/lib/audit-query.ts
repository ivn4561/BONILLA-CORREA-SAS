import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { APP_TIMEZONE } from "@/lib/brand";

export type AuditRow = {
  id: number; occurred_at: string; user_id: string | null; user_email: string | null; user_role: string | null;
  action: string; document_id: string | null; document_name: string | null; details: Record<string, unknown>;
  ip: string | null; city: string | null; region: string | null; country: string | null; user_agent: string | null;
  browser: string | null; os: string | null; device: string | null; session_id: string | null; prev_hash: string; hash: string;
};

export type AuditFilters = { user?: string; document?: string; action?: string; from?: string; to?: string };

export function filtersFromParams(p: URLSearchParams | Record<string, string | string[] | undefined>): AuditFilters {
  const get = (k: string) => {
    const v = p instanceof URLSearchParams ? p.get(k) : p[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s?.trim() ? s.trim() : undefined;
  };
  return { user: get("user"), document: get("document"), action: get("action"), from: get("from"), to: get("to") };
}

/** Convierte "AAAA-MM-DD" (fecha en la zona de la app) al instante UTC de las 00:00 de ese día. */
export function zonedDayStart(day: string, tz = APP_TIMEZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(guess));
  const v = (t: string) => Number(parts.find((x) => x.type === t)!.value);
  const asLocal = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return new Date(guess - (asLocal - guess));
}

function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

export async function queryAudit(f: AuditFilters, opts: { limit: number; offset: number; ascending?: boolean }) {
  let q = supabaseAdmin().from("audit_log").select("*", { count: "exact" });
  if (f.user) q = q.ilike("user_email", `%${escapeLike(f.user)}%`);
  if (f.document) q = q.or(`document_id.eq.${f.document.replace(/[,()]/g, "")},document_name.ilike.%${escapeLike(f.document).replace(/[,()]/g, "")}%`);
  if (f.action) q = q.eq("action", f.action);
  const from = f.from ? zonedDayStart(f.from) : null;
  const to = f.to ? zonedDayStart(f.to) : null;
  if (from) q = q.gte("occurred_at", from.toISOString());
  if (to) q = q.lt("occurred_at", new Date(to.getTime() + 86_400_000).toISOString());
  q = q.order("id", { ascending: !!opts.ascending }).range(opts.offset, opts.offset + opts.limit - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as AuditRow[], total: count ?? 0 };
}

/** Todas las filas que cumplen el filtro (paginando de a 1000, máximo 100 000). */
export async function queryAuditAll(f: AuditFilters): Promise<AuditRow[]> {
  const out: AuditRow[] = [];
  for (let offset = 0; offset < 100_000; offset += 1000) {
    const { rows } = await queryAudit(f, { limit: 1000, offset, ascending: true });
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export function locationOf(r: Pick<AuditRow, "city" | "region" | "country">) {
  return [r.city, r.region, r.country].filter(Boolean).join(", ");
}

/** Resumen legible de los detalles de un evento. */
export function detailsSummary(r: AuditRow): string {
  const d = r.details ?? {};
  const parts: string[] = [];
  if (d.motivo) parts.push(`motivo: ${d.motivo}`);
  if (d.pagina) parts.push(`página ${d.pagina}${d.de ? ` de ${d.de}` : ""}`);
  if (d.segundos_visible !== undefined) parts.push(`${formatDuration(Number(d.segundos_visible))} visible`);
  if (d.intento) parts.push(`intento: ${d.intento}`);
  if (d.usuario) parts.push(`usuario: ${d.usuario}`);
  if (d.rol) parts.push(`rol: ${d.rol}`);
  if (d.antes !== undefined || d.ahora !== undefined) parts.push(`${d.antes ?? "—"} → ${d.ahora ?? "—"}`);
  if (d.nuevos !== undefined) parts.push(`nuevos: ${d.nuevos}, retirados: ${d.retirados}`);
  if (d.filas !== undefined) parts.push(`${d.formato} · ${d.filas} filas`);
  if (d.resultado) parts.push(String(d.resultado));
  if (d.siguiente_paso) parts.push(`siguiente: ${d.siguiente_paso}`);
  if (d.version && r.action === "consentimiento_aceptado") parts.push(`versión ${d.version}`);
  return parts.join(" · ");
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec)) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}
