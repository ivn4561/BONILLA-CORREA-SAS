import "server-only";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRequestContext, type RequestContext } from "@/lib/request-context";

export type Actor = { id: string | null; email: string | null; role?: string | null };

export type AuditEvent = {
  action: string;
  actor?: Actor | null;
  documentId?: string | null;
  documentName?: string | null;
  details?: Record<string, unknown>;
  sessionId?: string | null;
  context?: RequestContext;
};

/**
 * Inserta una fila en el registro. Lanza error si no se pudo escribir:
 * los llamadores deben negar el acceso en ese caso ("sin registro no hay acceso").
 */
export async function logEvent(e: AuditEvent): Promise<void> {
  const ctx = e.context ?? (await getRequestContext(await headers()));
  const { error } = await supabaseAdmin().from("audit_log").insert({
    user_id: e.actor?.id ?? null,
    user_email: e.actor?.email?.toLowerCase() ?? null,
    user_role: e.actor?.role ?? null,
    action: e.action,
    document_id: e.documentId ?? null,
    document_name: e.documentName ?? null,
    details: { ...(e.details ?? {}), geo_fuente: ctx.geoSource },
    ip: ctx.ip,
    city: ctx.city,
    region: ctx.region,
    country: ctx.country,
    user_agent: ctx.userAgent,
    browser: ctx.browser,
    os: ctx.os,
    device: ctx.device,
    session_id: e.sessionId ?? null,
  });
  if (error) {
    console.error("No se pudo escribir en audit_log", error);
    throw new Error("No se pudo registrar la actividad");
  }
}
