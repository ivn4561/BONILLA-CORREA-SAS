import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Tarea diaria (Vercel Cron): una consulta mínima para que el plan gratuito de Supabase
 * no pause el proyecto por inactividad durante una auditoría. No devuelve datos.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { error } = await supabaseAdmin().from("documents").select("id", { head: true, count: "exact" });
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
