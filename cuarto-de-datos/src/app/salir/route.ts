import { NextResponse } from "next/server";
import { performLogout } from "@/lib/logout";

const MOTIVOS = new Set(["inactividad", "vencido", "revocado", "sin_perfil"]);

/** Cierre forzado (inactividad o acceso retirado). Solo acepta motivos del sistema. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const motivo = url.searchParams.get("motivo") ?? "";
  if (MOTIVOS.has(motivo)) await performLogout(motivo);
  return NextResponse.redirect(new URL(`/login${MOTIVOS.has(motivo) ? `?motivo=${motivo}` : ""}`, req.url));
}
