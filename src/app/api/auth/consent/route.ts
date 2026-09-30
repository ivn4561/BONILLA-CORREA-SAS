import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/http";
import { actorOf, getSessionState } from "@/lib/auth";
import { getRequestContext } from "@/lib/request-context";
import { logEvent } from "@/lib/audit";
import { LEGAL_VERSION } from "@/lib/legal";
import { logLoginSuccess } from "@/lib/login-flow";

// Ambas casillas deben venir marcadas: la autorización debe ser previa, expresa e informada.
const Body = z.object({ terms: z.literal(true), dataProcessing: z.literal(true) });

export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (body instanceof NextResponse) return body;
  const s = await getSessionState();
  if (s.stage !== "consent") return jsonError(409, "No hay una autorización pendiente.");

  const context = await getRequestContext(await headers());
  await logEvent({
    action: "consentimiento_aceptado",
    actor: actorOf(s),
    sessionId: s.sessionId,
    context,
    details: { version: LEGAL_VERSION, terminos_de_uso: body.terms, tratamiento_de_datos: body.dataProcessing },
  });
  await logLoginSuccess(s.profile!, s.sessionId, context);
  return NextResponse.json({ stage: "ok" });
}
