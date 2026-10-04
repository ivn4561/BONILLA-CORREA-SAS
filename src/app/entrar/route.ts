import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/audit";
import { getRequestContext } from "@/lib/request-context";
import { activityCookieOptions } from "@/lib/session-cookie";
import { ROOM_COOKIE, ROOM_PASS_TTL_MS, createRoomPass, readEntryToken, receptionGate } from "@/lib/reception";

export const dynamic = "force-dynamic";

/** Llegada desde la recepción: valida el pase de entrada y habilita la pantalla de ingreso del cuarto. */
export async function GET(req: Request) {
  const gate = receptionGate();
  const url = new URL(req.url);
  if (!gate) return NextResponse.redirect(new URL("/login", url));
  if (!readEntryToken(url.searchParams.get("t"), gate.secret)) return NextResponse.redirect(gate.url);

  // Sin registro no hay acceso: si no se puede anotar la llegada, se devuelve a la recepción.
  try {
    await logEvent({ action: "ingreso_recepcion", actor: null, context: await getRequestContext(await headers()) });
  } catch {
    return NextResponse.redirect(gate.url);
  }
  const res = NextResponse.redirect(new URL("/login", url));
  res.cookies.set(ROOM_COOKIE, createRoomPass(env.sessionSecret), { ...activityCookieOptions, maxAge: ROOM_PASS_TTL_MS / 1000 });
  return res;
}
